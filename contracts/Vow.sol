// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.19;

import "./lib/DSMath.sol";

interface VatLike {
    function dai(address) external view returns (uint256);
    function sin(address) external view returns (uint256);
    function heal(uint256) external;
    function hope(address) external;
    function nope(address) external;
}

interface FlapLike {
    function kick(uint256 lot, uint256 bid) external returns (uint256);
    function cage(uint256) external;
    function live() external returns (uint256);
}

interface FlopLike {
    function kick(address gal, uint256 lot, uint256 bid) external returns (uint256);
    function cage() external;
    function live() external returns (uint256);
}

interface GovTokenLike {
    function mint(address, uint256) external;
    function burn(address, uint256) external;
}

// Vow - System Accountant
// This contract manages system finances:
// - Debt queuing system with fess()/flog() functions
// - Surplus auctions (flap) to buy back governance tokens
// - Deficit auctions (flop) to mint governance tokens for recapitalization
// - Settlement mechanism for bad debt

contract Vow {
    using DSMath for uint256;

    // --- Auth ---
    mapping (address => uint256) public wards;
    function rely(address usr) external auth { wards[usr] = 1; }
    function deny(address usr) external auth { wards[usr] = 0; }
    modifier auth { require(wards[msg.sender] == 1, "Vow/not-authorized"); _; }

    // --- Data ---
    VatLike public vat;        // CDP Engine
    FlapLike public flapper;   // Surplus Auction House
    FlopLike public flopper;   // Deficit Auction House

    mapping (uint256 => uint256) public sin; // sin[timestamp]
    uint256 public Sin;   // Queued debt            [rad]
    uint256 public Ash;   // On-auction debt        [rad]

    uint256 public wait;  // Flop delay             [seconds]
    uint256 public dump;  // Flop initial lot size  [wad]
    uint256 public sump;  // Flop fixed bid size    [rad]

    uint256 public bump;  // Flap fixed lot size    [rad]
    uint256 public hump;  // Surplus buffer         [rad]

    uint256 public live;  // Active flag

    // --- Events ---
    event Fess(uint256 indexed era, uint256 tab);
    event Flog(uint256 indexed era, uint256 tab);
    event Heal(uint256 rad);
    event Kiss(uint256 rad);
    event Flop(uint256 indexed id, uint256 lot, uint256 bid);
    event Flap(uint256 indexed id, uint256 lot, uint256 bid);
    event Cage();

    // --- Init ---
    constructor(address vat_, address flapper_, address flopper_) {
        wards[msg.sender] = 1;
        vat  = VatLike(vat_);
        flapper = FlapLike(flapper_);
        flopper = FlopLike(flopper_);
        vat.hope(flapper_);
        live = 1;
    }

    // --- Math ---
    function min(uint256 x, uint256 y) internal pure returns (uint256 z) {
        return x <= y ? x : y;
    }
    function add(uint256 x, uint256 y) internal pure returns (uint256 z) {
        require((z = x + y) >= x);
    }
    function sub(uint256 x, uint256 y) internal pure returns (uint256 z) {
        require((z = x - y) <= x);
    }

    // --- Administration ---
    function file(bytes32 what, uint256 data) external auth {
        if      (what == "wait") wait = data;
        else if (what == "dump") dump = data;
        else if (what == "sump") sump = data;
        else if (what == "bump") bump = data;
        else if (what == "hump") hump = data;
        else revert("Vow/file-unrecognized-param");
    }

    function file(bytes32 what, address data) external auth {
        if (what == "flapper") {
            vat.nope(address(flapper));
            flapper = FlapLike(data);
            vat.hope(data);
        }
        else if (what == "flopper") flopper = FlopLike(data);
        else revert("Vow/file-unrecognized-param");
    }

    // --- Debt Management ---
    function fess(uint256 tab) external auth {
        sin[block.timestamp] = add(sin[block.timestamp], tab);
        Sin = add(Sin, tab);
        emit Fess(block.timestamp, tab);
    }

    function flog(uint256 era) external {
        require(add(era, wait) <= block.timestamp, "Vow/wait-not-finished");
        Sin = sub(Sin, sin[era]);
        emit Flog(era, sin[era]);
        sin[era] = 0;
    }

    function heal(uint256 rad) external {
        require(rad <= vat.dai(address(this)), "Vow/insufficient-dai");
        require(rad <= sub(sub(vat.sin(address(this)), Sin), Ash), "Vow/insufficient-debt");
        vat.heal(rad);
        emit Heal(rad);
    }

    function kiss(uint256 rad) external {
        require(rad <= Ash, "Vow/not-enough-ash");
        require(rad <= vat.dai(address(this)), "Vow/insufficient-dai");
        Ash = sub(Ash, rad);
        vat.heal(rad);
        emit Kiss(rad);
    }

    // --- Auction Management ---
    function flop() external returns (uint256 id) {
        require(sump <= sub(sub(vat.sin(address(this)), Sin), Ash), "Vow/insufficient-debt");
        require(vat.dai(address(this)) == 0, "Vow/surplus-not-zero");
        Ash = add(Ash, sump);
        id = flopper.kick(address(this), dump, sump);
        emit Flop(id, dump, sump);
    }

    function flap() external returns (uint256 id) {
        require(vat.dai(address(this)) >= add(vat.sin(address(this)), bump), "Vow/insufficient-surplus");
        require(sub(sub(vat.sin(address(this)), Sin), Ash) == 0, "Vow/debt-not-zero");
        id = flapper.kick(bump, 0);
        emit Flap(id, bump, 0);
    }

    function cage() external auth {
        require(live == 1, "Vow/not-live");
        live = 0;
        Sin = 0;
        Ash = 0;
        flapper.cage(vat.dai(address(this)));
        flopper.cage();
        emit Cage();
    }
}