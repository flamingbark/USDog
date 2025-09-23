// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.19;

import "./lib/DSMath.sol";

interface VatLike {
    function move(address, address, uint256) external;
    function flux(bytes32, address, address, uint256) external;
    function ilks(bytes32) external view returns (uint256, uint256, uint256, uint256, uint256);
}

interface DogLike {
    function chop(bytes32) external view returns (uint256);
    function digs(bytes32, uint256) external;
}

interface VowLike {
    function heal(uint256) external;
}

interface SpotLike {
    function par() external view returns (uint256);
}

interface CalcLike {
    function price(uint256, uint256) external view returns (uint256);
}

interface ClipperCalleeFunction {
    function clipperCall(address, uint256, uint256, bytes calldata) external;
}

// Clip - Dutch Auction Liquidator
// This contract handles liquidation auctions using a Dutch auction mechanism
// where prices automatically decrease over time

contract Clipper {
    using DSMath for uint256;

    // --- Auth ---
    mapping (address => uint256) public wards;
    function rely(address usr) external auth { wards[usr] = 1; }
    function deny(address usr) external auth { wards[usr] = 0; }
    modifier auth { require(wards[msg.sender] == 1, "Clipper/not-authorized"); _; }

    // --- Data ---
    bytes32 public ilk;            // Collateral type
    VatLike public vat;            // Core CDP Engine
    DogLike public dog;            // Liquidation module
    VowLike public vow;            // Debt engine
    SpotLike public spotter;       // Price module
    CalcLike public calc;          // Price calculator

    uint256 public buf;            // Multiplicative factor to increase starting price                    [ray]
    uint256 public tail;           // Time elapsed before auction reset                                   [seconds]
    uint256 public cusp;           // Percentage drop before auction reset                                [ray]
    uint64  public chip;           // Percentage of tip to reward small bids                              [wad]
    uint192 public tip;            // Flat fee to reward liquidation callers                             [rad]
    uint256 public chost;          // Cache the ilk dust times the ilk chop to prevent excessive SLOADs  [rad]
    
    uint256   public kicks = 1;    // Total auctions
    uint256[] public active;       // Array of active auction ids

    struct Sale {
        uint256 pos;  // Index in active array
        uint256 tab;  // Dai to raise       [rad]
        uint256 lot;  // collateral to sell [wad]
        address usr;  // Liquidated CDP
        uint96  tic;  // Auction start time
        uint256 top;  // Starting price     [ray]
    }
    mapping (uint256 => Sale) public sales;

    uint256 public live;

    // --- Events ---
    event Kick(
        uint256 indexed id,
        uint256 top,
        uint256 tab,
        uint256 lot,
        address indexed usr,
        address indexed kpr,
        uint256 coin
    );

    event Take(
        uint256 indexed id,
        uint256 max,
        uint256 price,
        uint256 owe,
        uint256 tab,
        uint256 lot,
        address indexed usr
    );

    event Redo(
        uint256 indexed id,
        uint256 top,
        uint256 tab,
        uint256 lot,
        address indexed usr,
        address indexed kpr,
        uint256 coin
    );

    // --- Init ---
    constructor(address vat_, address spotter_, address dog_, bytes32 ilk_) {
        vat = VatLike(vat_);
        spotter = SpotLike(spotter_);
        dog = DogLike(dog_);
        ilk = ilk_;
        buf = DSMath.RAY;
        wards[msg.sender] = 1;
        live = 1;
    }

    // --- Math ---
    function min(uint256 x, uint256 y) internal pure returns (uint256 z) {
        z = x <= y ? x : y;
    }
    function add(uint256 x, uint256 y) internal pure returns (uint256 z) {
        require((z = x + y) >= x);
    }
    function sub(uint256 x, uint256 y) internal pure returns (uint256 z) {
        require((z = x - y) <= x);
    }
    function mul(uint256 x, uint256 y) internal pure returns (uint256 z) {
        require(y == 0 || (z = x * y) / y == x);
    }
    function wmul(uint256 x, uint256 y) internal pure returns (uint256 z) {
        z = add(mul(x, y), DSMath.WAD / 2) / DSMath.WAD;
    }
    function rmul(uint256 x, uint256 y) internal pure returns (uint256 z) {
        z = add(mul(x, y), DSMath.RAY / 2) / DSMath.RAY;
    }
    function rdiv(uint256 x, uint256 y) internal pure returns (uint256 z) {
        z = add(mul(x, DSMath.RAY), y / 2) / y;
    }

    // --- Administration ---
    function file(bytes32 what, uint256 data) external auth {
        require(live == 1, "Clipper/not-live");
        if      (what == "buf")   buf = data;
        else if (what == "tail")  tail = data;        // Time elapsed before auction reset
        else if (what == "cusp")  cusp = data;        // Percentage drop before auction reset  
        else if (what == "chip")  chip = uint64(data); // Percentage of tip to reward small bids
        else if (what == "tip")   tip = uint192(data); // Flat fee to reward liquidation callers
        else if (what == "chost") chost = data;       // Cache the ilk dust times the ilk chop
        else revert("Clipper/file-unrecognized-param");
    }
    
    function file(bytes32 what, address data) external auth {
        require(live == 1, "Clipper/not-live");
        if (what == "spotter") spotter = SpotLike(data);
        else if (what == "dog") dog = DogLike(data);
        else if (what == "vow") vow = VowLike(data);
        else if (what == "calc") calc = CalcLike(data);
        else revert("Clipper/file-unrecognized-param");
    }

    // --- Auction ---

    // start an auction
    // note: trusts the caller to transfer collateral into the contract
    function kick(
        uint256 tab,  // Debt                   [rad]
        uint256 lot,  // Collateral             [wad]
        address usr,  // Address that will receive any leftover collateral
        address kpr   // Address that will receive incentives
    ) external auth returns (uint256 id) {
        
        // Input validation
        require(live == 1, "Clipper/not-live");
        require(tab  >  0, "Clipper/zero-tab");
        require(lot  >  0, "Clipper/zero-lot");
        require(usr != address(0), "Clipper/zero-usr");

        // Get starting price from spotter
        (, uint256 rate, uint256 spot,,) = vat.ilks(ilk);
        require(spot > 0, "Clipper/zero-spot-price");

        id = kicks++;

        sales[id].pos = active.length;
        sales[id].tab = tab;
        sales[id].lot = lot;
        sales[id].usr = usr;
        sales[id].tic = uint96(block.timestamp);

        uint256 top = rmul(rdiv(tab, lot), buf);
        sales[id].top = top;

        active.push(id);

        // incentive to kick auction
        uint256 _tip  = tip;
        uint256 _chip = chip;
        uint256 coin;
        if (_tip > 0 || _chip > 0) {
            coin = add(_tip, wmul(tab, _chip));
            vat.move(address(vow), kpr, coin);
        }

        emit Kick(id, top, tab, lot, usr, kpr, coin);
    }

    // Reset an auction
    // users can reset an auction if:
    // - price has dropped to cusp 
    // - tail seconds have passed
    function redo(
        uint256 id,  // id of the auction to reset
        address kpr  // Address that will receive incentives
    ) external {
        // Read auction data
        address usr = sales[id].usr;
        uint96  tic = sales[id].tic;
        uint256 top = sales[id].top;

        require(usr != address(0), "Clipper/not-running-auction");

        // Check that auction needs reset
        // and compute current price [ray]
        (bool done,) = status(tic, top);
        require(done, "Clipper/cannot-reset");

        uint256 tab = sales[id].tab;
        uint256 lot = sales[id].lot;
        sales[id].tic = uint96(block.timestamp);

        uint256 feedPrice = rdiv(tab, lot);
        top = rmul(feedPrice, buf);
        sales[id].top = top;

        // incentive to redo auction
        uint256 _tip  = tip;
        uint256 _chip = chip;  
        uint256 coin;
        if (_tip > 0 || _chip > 0) {
            uint256 _chost = chost;
            if (tab >= _chost && wmul(lot, feedPrice) >= _chost) {
                coin = add(_tip, wmul(tab, _chip));
                vat.move(address(vow), kpr, coin);
            }
        }

        emit Redo(id, top, tab, lot, usr, kpr, coin);
    }

    // Buy up to `amt` of collateral from the auction indexed by `id` 
    //
    // Auctions will not collect more dai than their assigned `tab` (see: kick);
    // surplus dai will be refunded to the taker.
    // To avoid partial purchases resulting in very small leftover auctions that will
    // never be cleared, any partial purchase must leave at least `chost` remaining `tab`.
    function take(
        uint256 id,        // Auction id
        uint256 amt,       // Upper limit on amount of collateral to buy  [wad]
        uint256 max,       // Maximum acceptable price (DAI / collateral) [ray]
        address who,       // Receiver of collateral and external call address
        bytes calldata data // Data to pass in external call; if length 0, no call is done
    ) external {
        
        address usr = sales[id].usr;
        uint96  tic = sales[id].tic;

        require(live == 1, "Clipper/not-live");
        require(usr != address(0), "Clipper/not-running-auction");

        uint256 price;
        {
            (bool done, uint256 _price) = status(tic, sales[id].top);

            // Check that auction doesn't need reset
            require(!done, "Clipper/needs-reset");
            price = _price;
        }

        // Ensure price is acceptable to buyer
        require(max >= price, "Clipper/too-expensive");

        uint256 lot = sales[id].lot;
        uint256 tab = sales[id].tab;
        uint256 owe;
        uint256 slice;

        {
            // Purchase as much as possible, up to amt
            slice = min(lot, amt);  // slice <= lot

            // DAI needed to buy a slice of this sale
            owe = wmul(slice, price);

            // Don't collect more than tab of DAI
            if (owe > tab) {
                // If slice == lot => auction completed => DAI needed <= tab
                // All remaining DAI debt will be forgiven (see `heal` below)
                owe = tab;                // owe' <= owe
                slice = wdiv(owe, price); // slice' = owe' / price <= owe / price == slice <= lot
            } else if (owe < tab && slice < lot) {
                // If tab > owe and slice < lot, then partial purchase at a positive (non-zero) price.
                // In this case, we have the desired amount is being purchased.
                // Check if remaining DAI debt is at least `chost`
                require(sub(tab, owe) >= chost, "Clipper/no-partial-purchase");
            }

            // Adjust auction
            sales[id].tab = sub(tab, owe);
            sales[id].lot = sub(lot, slice);
            vat.move(who, address(vow), owe);
            vat.flux(ilk, address(this), who, slice);

            // Removes auction from active array if no collateral left
            if (sales[id].lot == 0) {
                _remove(id);
            }

            emit Take(id, max, price, owe, tab, lot, who);
        }
        
        // Execute external call (if data.length > 0) before healing in vow
        if (data.length > 0) {
            ClipperCalleeFunction(who).clipperCall(msg.sender, owe, slice, data);
        }

        // Update `tab` with actual DAI collected
        dog.digs(ilk, owe);

        if (owe < tab) {
            vow.heal(owe);
        } else {
            vow.heal(tab);
        }
    }

    function _remove(uint256 id) internal {
        uint256 _move    = active[active.length - 1];
        uint256 _index   = sales[id].pos;
        active[_index]   = _move;
        sales[_move].pos = _index;
        active.pop();
        delete sales[id];
    }

    // The number of active auctions
    function count() external view returns (uint256) {
        return active.length;
    }

    // Return the entire array of active auctions
    function list() external view returns (uint256[] memory) {
        return active;
    }

    // Externally returns boolean for if an auction needs a redo and also the current price
    function getStatus(uint256 id) external view returns (bool needsRedo, uint256 price, uint256 lot, uint256 tab) {
        // Read auction data
        address usr = sales[id].usr;
        uint96  tic = sales[id].tic;
        uint256 top = sales[id].top;

        bool done;
        (done, price) = status(tic, top);
        needsRedo = usr != address(0) && done;

        lot = sales[id].lot;
        tab = sales[id].tab;
    }

    // Internally returns boolean for if an auction needs a redo
    function status(uint96 tic, uint256 top) internal view returns (bool done, uint256 price) {
        price = calc.price(top, sub(block.timestamp, uint256(tic)));
        done  = (sub(block.timestamp, uint256(tic)) > tail || rdiv(price, top) < cusp);
    }

    function wdiv(uint256 x, uint256 y) internal pure returns (uint256 z) {
        z = add(mul(x, DSMath.WAD), y / 2) / y;
    }

    // --- Shutdown ---
    function cage() external auth {
        live = 0;
    }

    // Cash out remaining collateral and dai balance from active auctions during shutdown
    function cash(bytes32, uint256 id) external {
        require(live == 0, "Clipper/still-live");

        vat.flux(ilk, address(this), msg.sender, sales[id].lot);
        vat.move(address(this), msg.sender, sales[id].tab);
        _remove(id);
    }
}