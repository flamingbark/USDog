// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.19;

import "./lib/DSMath.sol";

interface VatLike {
    function ilks(bytes32) external view returns (uint256, uint256, uint256, uint256, uint256);
    function fold(bytes32, address, int256) external;
}

// Jug - Stability Fee Accumulator
// This contract accrues interest rates (stability fees) over time for each collateral type
// It updates debt multipliers in the Vat and collects stability fee revenue

contract Jug {
    using DSMath for uint256;

    // --- Auth ---
    mapping (address => uint256) public wards;
    function rely(address usr) external auth { wards[usr] = 1; }
    function deny(address usr) external auth { wards[usr] = 0; }
    modifier auth { require(wards[msg.sender] == 1, "Jug/not-authorized"); _; }

    // --- Data ---
    struct Ilk {
        uint256 duty; // Collateral-specific, per-second compound rate [ray]
        uint256 rho;  // Time of last drip [unix epoch time]
    }

    mapping (bytes32 => Ilk) public ilks;
    VatLike public vat;        // CDP Engine
    address public vow;        // Debt Engine
    uint256 public base;       // Global, per-second compound rate [ray]

    uint256 public live;       // Active flag

    // --- Events ---
    event Init(bytes32 indexed ilk);
    event File(bytes32 indexed what, uint256 data);
    event File(bytes32 indexed ilk, bytes32 indexed what, uint256 data);
    event File(bytes32 indexed what, address data);
    event Drip(bytes32 indexed ilk, uint256 rate);

    // --- Init ---
    constructor(address vat_) {
        wards[msg.sender] = 1;
        vat = VatLike(vat_);
        live = 1;
    }

    // --- Math ---
    function rpow(uint256 x, uint256 n, uint256 base_) internal pure returns (uint256 z) {
        assembly {
            switch x case 0 {switch n case 0 {z := base_} default {z := 0}}
            default {
                switch mod(n, 2) case 0 { z := base_ } default { z := x }
                let half := div(base_, 2)  // for rounding.
                for { n := div(n, 2) } n { n := div(n,2) } {
                    let xx := mul(x, x)
                    if iszero(eq(div(xx, x), x)) { revert(0,0) }
                    let xxRound := add(xx, half)
                    if lt(xxRound, xx) { revert(0,0) }
                    x := div(xxRound, base_)
                    if mod(n,2) {
                        let zx := mul(z, x)
                        if and(iszero(iszero(x)), iszero(eq(div(zx, x), z))) { revert(0,0) }
                        let zxRound := add(zx, half)
                        if lt(zxRound, zx) { revert(0,0) }
                        z := div(zxRound, base_)
                    }
                }
            }
        }
    }

    // --- Administration ---
    function init(bytes32 ilk) external auth {
        Ilk storage i = ilks[ilk];
        require(i.rho == 0, "Jug/ilk-already-init");
        i.rho = block.timestamp;
        emit Init(ilk);
    }

    function file(bytes32 what, uint256 data) external auth {
        require(live == 1, "Jug/not-live");
        if (what == "base") base = data;
        else revert("Jug/file-unrecognized-param");
        emit File(what, data);
    }
    
    function file(bytes32 ilk, bytes32 what, uint256 data) external auth {
        require(live == 1, "Jug/not-live");
        if (what == "duty") ilks[ilk].duty = data;
        else revert("Jug/file-unrecognized-param");
        emit File(ilk, what, data);
    }
    
    function file(bytes32 what, address data) external auth {
        require(live == 1, "Jug/not-live");
        if (what == "vow") vow = data;
        else revert("Jug/file-unrecognized-param");
        emit File(what, data);
    }

    function cage() external auth {
        live = 0;
    }

    // --- Stability Fee Collection ---
    function drip(bytes32 ilk) external returns (uint256 rate) {
        require(block.timestamp >= ilks[ilk].rho, "Jug/invalid-now");
        (, uint256 prev,,,) = vat.ilks(ilk);
        rate = DSMath.rmul(rpow(DSMath.add(base, ilks[ilk].duty), block.timestamp - ilks[ilk].rho, DSMath.RAY), prev);
        vat.fold(ilk, vow, int256(rate) - int256(prev));
        ilks[ilk].rho = block.timestamp;
        emit Drip(ilk, rate);
    }

    // --- Getters ---
    function rho(bytes32 ilk) external view returns (uint256) {
        return ilks[ilk].rho;
    }
    
    function duty(bytes32 ilk) external view returns (uint256) {
        return ilks[ilk].duty;
    }
}