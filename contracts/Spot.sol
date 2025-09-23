// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.19;

import "./lib/DSMath.sol";

interface VatLike {
    function file(bytes32, bytes32, uint256) external;
}

interface PipLike {
    function peek() external returns (bytes32, bool);
}

// Spot - Price Feed Manager
// This contract centralizes price data from oracles and applies safety margins
// It fetches prices from external price feeds and updates liquidation thresholds in the Vat

contract Spot {
    using DSMath for uint256;

    // --- Auth ---
    mapping (address => uint256) public wards;
    function rely(address guy) external auth { wards[guy] = 1; }
    function deny(address guy) external auth { wards[guy] = 0; }
    modifier auth { require(wards[msg.sender] == 1, "Spot/not-authorized"); _; }

    // --- Data ---
    struct Ilk {
        PipLike pip;  // Price Feed
        uint256 mat;  // Liquidation ratio [ray]
    }

    mapping (bytes32 => Ilk) public ilks;

    VatLike public vat;  // CDP Engine
    uint256 public par;  // ref per dai [ray]
    uint256 public live; // Access Flag

    // --- Events ---
    event Poke(
        bytes32 indexed ilk,
        bytes32 indexed val, // [wad]
        uint256 indexed spot // [ray]
    );

    // --- Init ---
    constructor(address vat_) {
        wards[msg.sender] = 1;
        vat = VatLike(vat_);
        par = DSMath.RAY; // Pegged to $1
        live = 1;
    }

    // --- Math ---
    function mul(uint256 x, uint256 y) internal pure returns (uint256 z) {
        require(y == 0 || (z = x * y) / y == x);
    }
    function rdiv(uint256 x, uint256 y) internal pure returns (uint256 z) {
        z = mul(x, DSMath.RAY) / y;
    }

    // --- Administration ---
    function file(bytes32 what, uint256 data) external auth {
        require(live == 1, "Spot/not-live");
        if (what == "par") par = data;
        else revert("Spot/file-unrecognized-param");
    }
    
    function file(bytes32 ilk, bytes32 what, uint256 data) external auth {
        require(live == 1, "Spot/not-live");
        if (what == "mat") ilks[ilk].mat = data;
        else revert("Spot/file-unrecognized-param");
    }
    
    function file(bytes32 ilk, bytes32 what, address pip_) external auth {
        require(live == 1, "Spot/not-live");
        if (what == "pip") ilks[ilk].pip = PipLike(pip_);
        else revert("Spot/file-unrecognized-param");
    }

    function cage() external auth {
        live = 0;
    }

    // --- Update Spot Price ---
    function poke(bytes32 ilk) external {
        (bytes32 val, bool has) = ilks[ilk].pip.peek();
        uint256 spot = has ? rdiv(rdiv(mul(uint256(val), 10 ** 9), par), ilks[ilk].mat) : 0;
        vat.file(ilk, bytes32("spot"), spot);
        emit Poke(ilk, val, spot);
    }
}