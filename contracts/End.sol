// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.19;

import "./lib/DSMath.sol";

interface VatLike {
    function dai(address) external view returns (uint256);
    function ilks(bytes32) external view returns (uint256, uint256, uint256, uint256, uint256);
    function urns(bytes32, address) external view returns (uint256, uint256);
    function debt() external returns (uint256);
    function move(address, address, uint256) external;
    function hope(address) external;
    function flux(bytes32, address, address, uint256) external;
    function grab(bytes32, address, address, address, int256, int256) external;
    function suck(address, address, uint256) external;
    function cage() external;
}

interface CatLike {
    function ilks(bytes32) external view returns (address, uint256, uint256);
}

interface DogLike {
    function ilks(bytes32) external view returns (address, uint256, uint256, uint256);
    function cage(bytes32) external;
}

interface VowLike {
    function cage() external;
}

interface JugLike {
    function cage() external;
}

interface PotLike {
    function cage() external;
}

interface SpotLike {
    function cage() external;
}

interface StableCoinLike {
    function burn(address, uint256) external;
}

interface GemLike {
    function transfer(address, uint256) external returns (bool);
}

// End - Emergency Shutdown
// This contract provides global settlement mechanism:
// - System shutdown in crisis situations  
// - Collateral redemption for stablecoin holders
// - Multi-phase settlement process (cage → skim → flow → pack → cash)

contract End {
    using DSMath for uint256;

    // --- Auth ---
    mapping (address => uint256) public wards;
    function rely(address usr) external auth { wards[usr] = 1; }
    function deny(address usr) external auth { wards[usr] = 0; }
    modifier auth { require(wards[msg.sender] == 1, "End/not-authorized"); _; }

    // --- Data ---
    VatLike   public vat;   // CDP Engine
    DogLike   public dog;   // Liquidation Module
    VowLike   public vow;   // System Debt Module
    JugLike   public jug;   // Stability Fee Module
    PotLike   public pot;   // Savings Module
    SpotLike  public spot;  // Price Module

    uint256   public live;  // Active Flag
    uint256   public when;  // Time of cage                   [unix epoch time]
    uint256   public wait;  // Processing Cooldown Length             [seconds]
    uint256   public debt;  // Outstanding stablecoin following processing [rad]

    mapping (bytes32 => uint256) public tag;  // Cage price              [ray]
    mapping (bytes32 => uint256) public gap;  // Collateral shortfall    [wad]
    mapping (bytes32 => uint256) public Art;  // Total debt per ilk      [wad]
    mapping (bytes32 => uint256) public fix;  // Final cash price        [ray]

    mapping (address => uint256)                      public bag;  // [wad]
    mapping (bytes32 => mapping (address => uint256)) public out;  // [wad]

    // --- Events ---
    event Cage();
    event Cage(bytes32 indexed ilk);
    event Skip(bytes32 indexed ilk, uint256 indexed id);
    event Skim(bytes32 indexed ilk, address indexed urn, uint256 wad, uint256 art);
    event Free(bytes32 indexed ilk, address indexed usr, uint256 ink);
    event Thaw();
    event Flow(bytes32 indexed ilk);
    event Pack(address indexed usr, uint256 wad);
    event Cash(bytes32 indexed ilk, address indexed usr, uint256 wad);

    // --- Init ---
    constructor() {
        wards[msg.sender] = 1;
        live = 1;
    }

    // --- Math ---
    function add(uint256 x, uint256 y) internal pure returns (uint256 z) {
        z = x + y;
        require(z >= x);
    }
    function sub(uint256 x, uint256 y) internal pure returns (uint256 z) {
        require((z = x - y) <= x);
    }
    function mul(uint256 x, uint256 y) internal pure returns (uint256 z) {
        require(y == 0 || (z = x * y) / y == x);
    }
    function min(uint256 x, uint256 y) internal pure returns (uint256 z) {
        return x <= y ? x : y;
    }
    uint256 constant WAD = 10 ** 18;
    uint256 constant RAY = 10 ** 27;
    function rmul(uint256 x, uint256 y) internal pure returns (uint256 z) {
        z = add(mul(x, y), RAY / 2) / RAY;
    }
    function wdiv(uint256 x, uint256 y) internal pure returns (uint256 z) {
        z = add(mul(x, WAD), y / 2) / y;
    }

    // --- Administration ---
    function file(bytes32 what, address data) external auth {
        require(live == 1, "End/not-live");
        if (what == "vat") vat = VatLike(data);
        else if (what == "dog") dog = DogLike(data);
        else if (what == "vow") vow = VowLike(data);
        else if (what == "jug") jug = JugLike(data);
        else if (what == "pot") pot = PotLike(data);
        else if (what == "spot") spot = SpotLike(data);
        else revert("End/file-unrecognized-param");
    }

    function file(bytes32 what, uint256 data) external auth {
        require(live == 1, "End/not-live");
        if (what == "wait") wait = data;
        else revert("End/file-unrecognized-param");
    }

    // --- Settlement ---
    function cage() external auth {
        require(live == 1, "End/not-live");
        live = 0;
        when = block.timestamp;
        vat.cage();
        dog.cage("DOGE-A");
        dog.cage("SHIB-A"); 
        vow.cage();
        jug.cage();
        pot.cage();
        spot.cage();
        emit Cage();
    }

    function cage(bytes32 ilk) external {
        require(live == 0, "End/still-live");
        require(tag[ilk] == 0, "End/tag-set");
        (uint256 art, uint256 rate, uint256 spot,,) = vat.ilks(ilk);
        Art[ilk] = mul(rate, art);
        tag[ilk] = spot;
        emit Cage(ilk);
    }

    function skip(bytes32 ilk, uint256 id) external {
        require(tag[ilk] != 0, "End/tag-not-set");

        emit Skip(ilk, id);
    }

    function skim(bytes32 ilk, address urn) external {
        require(tag[ilk] != 0, "End/tag-not-set");
        (uint256 ink, uint256 art) = vat.urns(ilk, urn);
        (, uint256 rate,,,) = vat.ilks(ilk);
        uint256 owe = rmul(rmul(art, rate), tag[ilk]);
        uint256 wad = min(ink, owe);
        gap[ilk] = add(gap[ilk], sub(owe, wad));

        vat.grab(ilk, urn, address(this), address(vow), -int256(wad), -int256(art));
        emit Skim(ilk, urn, wad, art);
    }

    function free(bytes32 ilk) external {
        require(live == 0, "End/still-live");
        (uint256 ink,) = vat.urns(ilk, msg.sender);
        vat.grab(ilk, msg.sender, msg.sender, address(vow), -int256(ink), 0);
        emit Free(ilk, msg.sender, ink);
    }

    function thaw() external {
        require(live == 0, "End/still-live");
        require(debt == 0, "End/debt-not-zero");
        require(vat.dai(address(vow)) == 0, "End/surplus-not-zero");
        require(block.timestamp >= add(when, wait), "End/wait-not-finished");
        debt = vat.debt();
        emit Thaw();
    }

    function flow(bytes32 ilk) external {
        require(debt != 0, "End/not-processing");
        (, uint256 rate,,,) = vat.ilks(ilk);
        require(fix[ilk] == 0, "End/fix-set");

        Art[ilk] = rmul(Art[ilk], rate);
        fix[ilk] = wdiv(sub(wdiv(Art[ilk], debt), gap[ilk]), Art[ilk]);
        emit Flow(ilk);
    }

    function pack(uint256 wad) external {
        require(debt != 0, "End/not-processing");
        vat.move(msg.sender, address(vow), mul(wad, RAY));
        bag[msg.sender] = add(bag[msg.sender], wad);
        emit Pack(msg.sender, wad);
    }

    function cash(bytes32 ilk, uint256 wad) external {
        require(fix[ilk] != 0, "End/fix-not-set");
        vat.flux(ilk, address(this), msg.sender, rmul(wad, fix[ilk]));
        out[ilk][msg.sender] = add(out[ilk][msg.sender], wad);
        require(out[ilk][msg.sender] <= bag[msg.sender], "End/insufficient-bag-balance");
        emit Cash(ilk, msg.sender, wad);
    }
}