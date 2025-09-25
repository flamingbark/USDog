// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.19;

import "./lib/DSMath.sol";

interface VatLike {
    function move(address, address, uint256) external;
    function suck(address, address, uint256) external;
}

// Pot - Dai Savings Rate
// This contract manages stablecoin holders' savings by:
// - Interest accrual for deposited stablecoins
// - Savings rate distribution mechanism
// - Allowing users to earn yield on their stablecoin holdings

contract Pot {
    using DSMath for uint256;

    // --- Auth ---
    mapping (address => uint256) public wards;
    function rely(address guy) external auth { wards[guy] = 1; }
    function deny(address guy) external auth { wards[guy] = 0; }
    modifier auth { require(wards[msg.sender] == 1, "Pot/not-authorized"); _; }

    // --- Data ---
    mapping (address => uint256) public pie;  // Normalised Savings Dai [wad]

    uint256 public Pie;   // Total Normalised Savings Dai  [wad]
    uint256 public dsr;   // The Dai Savings Rate          [ray]
    uint256 public chi;   // The Rate Accumulator          [ray]

    VatLike public vat;   // CDP engine
    address public vow;   // Debt engine
    uint256 public rho;   // Time of last drip     [unix epoch time]

    uint256 public live;  // Active flag

    // --- Events ---
    event Join(address indexed usr, uint256 wad);
    event Exit(address indexed usr, uint256 wad);
    event Drip(uint256 tmp);
    event File(bytes32 indexed what, uint256 data);
    event File(bytes32 indexed what, address addr);
    event Cage();

    // --- Init ---
    constructor(address vat_) {
        wards[msg.sender] = 1;
        vat = VatLike(vat_);
        dsr = DSMath.RAY;
        chi = DSMath.RAY;
        rho = block.timestamp;
        live = 1;
    }

    // --- Math ---
    function rpow(uint256 x, uint256 n, uint256 base) internal pure returns (uint256 z) {
        assembly {
            switch x case 0 {switch n case 0 {z := base} default {z := 0}}
            default {
                switch mod(n, 2) case 0 { z := base } default { z := x }
                let half := div(base, 2)  // for rounding.
                for { n := div(n, 2) } n { n := div(n,2) } {
                    let xx := mul(x, x)
                    if iszero(eq(div(xx, x), x)) { revert(0,0) }
                    let xxRound := add(xx, half)
                    if lt(xxRound, xx) { revert(0,0) }
                    x := div(xxRound, base)
                    if mod(n,2) {
                        let zx := mul(z, x)
                        if and(iszero(iszero(x)), iszero(eq(div(zx, x), z))) { revert(0,0) }
                        let zxRound := add(zx, half)
                        if lt(zxRound, zx) { revert(0,0) }
                        z := div(zxRound, base)
                    }
                }
            }
        }
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

    // --- Administration ---
    function file(bytes32 what, uint256 data) external auth {
        require(live == 1, "Pot/not-live");
        if (what == "dsr") dsr = data;
        else revert("Pot/file-unrecognized-param");
        emit File(what, data);
    }

    function file(bytes32 what, address addr) external auth {
        require(live == 1, "Pot/not-live");
        if (what == "vow") vow = addr;
        else revert("Pot/file-unrecognized-param");
        emit File(what, addr);
    }

    function cage() external auth {
        live = 0;
        dsr = DSMath.RAY;
        emit Cage();
    }

    // --- Savings Rate Accumulation ---
    function drip() external returns (uint256 tmp) {
        require(block.timestamp >= rho, "Pot/invalid-now");
        tmp = DSMath.rmul(rpow(dsr, block.timestamp - rho, DSMath.RAY), chi);
        uint256 chi_ = sub(tmp, chi);
        chi = tmp;
        rho = block.timestamp;
        vat.suck(address(vow), address(this), mul(Pie, chi_));
        emit Drip(tmp);
    }

    // --- Savings Dai Management ---
    function join(uint256 wad) external {
        // Allow join any time at or after the last drip to make UX and tests deterministic
        require(block.timestamp >= rho, "Pot/rho-not-updated");
        pie[msg.sender] = add(pie[msg.sender], wad);
        Pie             = add(Pie, wad);
        vat.move(msg.sender, address(this), mul(chi, wad));
        emit Join(msg.sender, wad);
    }

    function exit(uint256 wad) external {
        pie[msg.sender] = sub(pie[msg.sender], wad);
        Pie             = sub(Pie, wad);
        vat.move(address(this), msg.sender, mul(chi, wad));
        emit Exit(msg.sender, wad);
    }
}