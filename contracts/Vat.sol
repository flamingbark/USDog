// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.19;

import "./lib/DSMath.sol";

// Vat - Central Accounting Engine
// This contract manages all core accounting for the stablecoin system including:
// - Collateral deposits and withdrawals
// - Debt positions (Vaults/CDPs)  
// - Collateral type configurations
// - System-wide debt limits and parameters

contract Vat {
    using DSMath for uint256;

    // --- Auth ---
    mapping (address => uint256) public wards;
    function rely(address usr) external auth { wards[usr] = 1; }
    function deny(address usr) external auth { wards[usr] = 0; }
    modifier auth { require(wards[msg.sender] == 1, "Vat/not-authorized"); _; }

    // --- Data ---
    
    // Collateral type data
    struct Ilk {
        uint256 Art;   // Total normalized debt     [wad]
        uint256 rate;  // Accumulated rates         [ray]
        uint256 spot;  // Price with safety margin  [ray]
        uint256 line;  // Debt ceiling              [rad]
        uint256 dust;  // Urn debt floor            [rad]
    }
    
    // Vault/CDP data  
    struct Urn {
        uint256 ink;   // Locked collateral  [wad]
        uint256 art;   // Normalized debt    [wad]
    }

    mapping (bytes32 => Ilk)                       public ilks;    // Collateral types
    mapping (bytes32 => mapping (address => Urn)) public urns;    // Vaults
    mapping (bytes32 => mapping (address => uint256)) public gem; // Collateral tokens
    mapping (address => uint256)                   public dai;    // Stablecoin balances
    mapping (address => uint256)                   public sin;    // Unbacked dai (system debt)

    uint256 public debt;  // Total debt outstanding       [rad]
    uint256 public vice;  // Total system debt            [rad]
    uint256 public Line;  // Total debt ceiling           [rad]
    uint256 public live;  // Access flag (1 = live, 0 = caged)

    // --- Events ---
    
    event LogNote(
        bytes4   indexed sig,
        address  indexed usr,
        bytes32  indexed arg1,
        bytes32  indexed arg2,
        bytes    data
    ) anonymous;

    modifier note {
        _;
        emit LogNote(msg.sig, msg.sender, 0, 0, msg.data);
    }

    // --- Init ---
    
    constructor() {
        wards[msg.sender] = 1;
        live = 1;
    }

    // --- Math ---
    
    function _add(uint256 x, uint256 y) internal pure returns (uint256 z) {
        require((z = x + y) >= x);
    }
    
    function _sub(uint256 x, uint256 y) internal pure returns (uint256 z) {
        require((z = x - y) <= x);
    }
    
    function _mul(uint256 x, uint256 y) internal pure returns (uint256 z) {
        require(y == 0 || (z = x * y) / y == x);
    }

    // Signed integer addition
    function _addInt(uint256 x, int256 y) internal pure returns (uint256 z) {
        z = y < 0 ? _sub(x, uint256(-y)) : _add(x, uint256(y));
    }

    // Signed integer multiplication
    function _mulInt(uint256 x, int256 y) internal pure returns (int256 z) {
        z = y < 0 ? -int256(_mul(x, uint256(-y))) : int256(_mul(x, uint256(y)));
    }

    // --- Administration ---
    
    function init(bytes32 ilk) external auth {
        require(ilks[ilk].rate == 0, "Vat/ilk-already-init");
        ilks[ilk].rate = 10 ** 27; // Initialize at 1.0 rate
    }
    
    function file(bytes32 what, uint256 data) external auth {
        require(live == 1, "Vat/not-live");
        if (what == "Line") Line = data;
        else revert("Vat/file-unrecognized-param");
    }
    
    function file(bytes32 ilk, bytes32 what, uint256 data) external auth {
        require(live == 1, "Vat/not-live");
        if (what == "spot") ilks[ilk].spot = data;
        else if (what == "line") ilks[ilk].line = data;
        else if (what == "dust") ilks[ilk].dust = data;
        else revert("Vat/file-unrecognized-param");
    }

    function cage() external auth {
        live = 0;
    }

    // --- Fungibility ---
    
    function slip(bytes32 ilk, address usr, int256 wad) external auth {
        gem[ilk][usr] = _addInt(gem[ilk][usr], wad);
    }
    
    function flux(bytes32 ilk, address src, address dst, uint256 wad) external {
        require(wish(src, msg.sender), "Vat/not-allowed");
        gem[ilk][src] = _sub(gem[ilk][src], wad);
        gem[ilk][dst] = _add(gem[ilk][dst], wad);
    }
    
    function move(address src, address dst, uint256 rad) external {
        require(wish(src, msg.sender), "Vat/not-allowed");
        dai[src] = _sub(dai[src], rad);
        dai[dst] = _add(dai[dst], rad);
    }

    function wish(address bit, address usr) internal view returns (bool) {
        return either(bit == usr, can[bit][usr] == 1);
    }
    
    function either(bool x, bool y) internal pure returns (bool z) {
        assembly{ z := or(x, y)}
    }

    // --- CDP Manipulation ---
    
    function frob(bytes32 i, address u, address v, address w, int256 dink, int256 dart) external {
        Urn memory urn = urns[i][u];
        Ilk memory ilk = ilks[i];
        
        // Urn has been previously manipulated, live urn, or a line exists
        require(ilk.rate != 0, "Vat/ilk-not-init");

        urn.ink = _addInt(urn.ink, dink);
        urn.art = _addInt(urn.art, dart);
        ilk.Art = _addInt(ilk.Art, dart);

        int256 dtab = _mulInt(ilk.rate, dart);
        uint256 tab = _mul(ilk.rate, urn.art);
        debt = _addInt(debt, dtab);

        // Either debt has decreased, or debt ceilings are not exceeded
        require(either(dart <= 0, both(_mul(ilk.Art, ilk.rate) <= ilk.line, debt <= Line)), "Vat/ceiling-exceeded");
        
        // Urn is either less risky than before, or it is safe
        require(either(both(dart <= 0, dink >= 0), tab <= _mul(urn.ink, ilk.spot)), "Vat/not-safe");

        // Urn is either more safe, or the owner consents
        require(either(both(dart <= 0, dink >= 0), wish(u, msg.sender)), "Vat/not-allowed-u");
        
        // Collateral src consents
        require(either(dink <= 0, wish(v, msg.sender)), "Vat/not-allowed-v");
        
        // Dai dst consents  
        require(either(dart >= 0, wish(w, msg.sender)), "Vat/not-allowed-w");

        // Urn has no debt, or a non-dusty amount
        require(either(urn.art == 0, tab >= ilk.dust), "Vat/dust");

        gem[i][v] = _addInt(gem[i][v], -dink);
        dai[w] = _addInt(dai[w], dtab);
        urns[i][u] = urn;
        ilks[i] = ilk;
    }

    // --- Rates ---
    
    function fold(bytes32 i, address u, int256 rate) external auth {
        require(live == 1, "Vat/not-live");
        Ilk storage ilk = ilks[i];
        ilk.rate = _addInt(ilk.rate, rate);
        int256 rad = _mulInt(ilk.Art, rate);
        dai[u] = _addInt(dai[u], rad);
        debt = _addInt(debt, rad);
    }

    // --- CDP Confiscation ---
    
    function grab(bytes32 i, address u, address v, address w, int256 dink, int256 dart) external auth {
        Urn storage urn = urns[i][u];
        Ilk storage ilk = ilks[i];

        urn.ink = _addInt(urn.ink, dink);
        urn.art = _addInt(urn.art, dart);
        ilk.Art = _addInt(ilk.Art, dart);

        int256 dtab = _mulInt(ilk.rate, dart);

        gem[i][v] = _addInt(gem[i][v], -dink);
        sin[w] = _addInt(sin[w], -dtab);
        vice = _addInt(vice, -dtab);
    }

    // --- Settlement ---
    
    function heal(uint256 rad) external {
        address u = msg.sender;
        sin[u] = _sub(sin[u], rad);
        dai[u] = _sub(dai[u], rad);
        vice = _sub(vice, rad);
        debt = _sub(debt, rad);
    }

    function suck(address u, address v, uint256 rad) external auth {
        sin[u] = _add(sin[u], rad);
        dai[v] = _add(dai[v], rad);
        vice = _add(vice, rad);
        debt = _add(debt, rad);
    }

    // --- CDP Engine ---
    
    mapping (address => mapping (address => uint256)) public can;
    
    function hope(address usr) external { can[msg.sender][usr] = 1; }
    function nope(address usr) external { can[msg.sender][usr] = 0; }

    function both(bool x, bool y) internal pure returns (bool z) {
        assembly{ z := and(x, y)}
    }
}