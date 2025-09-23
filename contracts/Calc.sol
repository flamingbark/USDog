// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.19;

import "./lib/DSMath.sol";

// LinearDecrease - Linear price decrease calculator
// Price decreases linearly over time for Dutch auctions

contract LinearDecrease {
    using DSMath for uint256;

    // --- Auth ---
    mapping (address => uint256) public wards;
    function rely(address usr) external auth { wards[usr] = 1; }
    function deny(address usr) external auth { wards[usr] = 0; }
    modifier auth { require(wards[msg.sender] == 1, "LinearDecrease/not-authorized"); _; }

    // --- Data ---
    uint256 public tau; // Seconds after auction start when the price reaches zero [seconds]

    constructor() {
        wards[msg.sender] = 1;
        tau = 3600; // Default 1 hour
    }

    // --- Administration ---
    function file(bytes32 what, uint256 data) external auth {
        if (what == "tau") tau = data;
        else revert("LinearDecrease/file-unrecognized-param");
    }

    // --- Math ---
    function add(uint256 x, uint256 y) internal pure returns (uint256 z) {
        require((z = x + y) >= x);
    }
    function sub(uint256 x, uint256 y) internal pure returns (uint256 z) {
        require((z = x - y) <= x);
    }
    function mul(uint256 x, uint256 y) internal pure returns (uint256 z) {
        require(y == 0 || (z = x * y) / y == x);
    }

    // --- Pricing ---
    function price(uint256 top, uint256 dur) external view returns (uint256) {
        if (dur >= tau) return 0;
        return sub(top, mul(top, dur) / tau);
    }
}

// StairstepExponentialDecrease - Exponential price decrease in steps
// Price decreases exponentially in discrete steps for more predictable auctions

contract StairstepExponentialDecrease {
    using DSMath for uint256;

    // --- Auth ---
    mapping (address => uint256) public wards;
    function rely(address usr) external auth { wards[usr] = 1; }
    function deny(address usr) external auth { wards[usr] = 0; }
    modifier auth { require(wards[msg.sender] == 1, "StairstepExponentialDecrease/not-authorized"); _; }

    // --- Data ---
    uint256 public step; // Length of time between price drops [seconds]
    uint256 public cut;  // Per-step multiplicative factor [ray]

    constructor() {
        wards[msg.sender] = 1;
        step = 300;             // Default 5 minutes
        cut = 995000000000000000000000000;  // Default 0.5% reduction per step
    }

    // --- Administration ---
    function file(bytes32 what, uint256 data) external auth {
        if (what == "cut") {
            require(data < DSMath.RAY, "StairstepExponentialDecrease/cut-too-high");
            cut = data;
        }
        else if (what == "step") {
            require(data > 0, "StairstepExponentialDecrease/step-too-low");
            step = data;
        }
        else revert("StairstepExponentialDecrease/file-unrecognized-param");
    }

    // --- Math ---
    uint256 constant RAY = 10 ** 27;
    
    function rmul(uint256 x, uint256 y) internal pure returns (uint256 z) {
        z = DSMath.add(DSMath.mul(x, y), RAY / 2) / RAY;
    }

    function rpow(uint256 x, uint256 n) internal pure returns (uint256 z) {
        z = n % 2 != 0 ? x : RAY;
        
        for (n /= 2; n != 0; n /= 2) {
            x = rmul(x, x);
            if (n % 2 != 0) {
                z = rmul(z, x);
            }
        }
    }

    // --- Pricing ---
    function price(uint256 top, uint256 dur) external view returns (uint256) {
        if (step == 0) return 0;
        
        uint256 elapsed = dur / step;
        if (elapsed == 0) return top;
        
        return rmul(top, rpow(cut, elapsed));
    }
}

// ExponentialDecrease - Smooth exponential price decrease
// Price decreases smoothly using exponential decay

contract ExponentialDecrease {
    using DSMath for uint256;

    // --- Auth ---
    mapping (address => uint256) public wards;
    function rely(address usr) external auth { wards[usr] = 1; }
    function deny(address usr) external auth { wards[usr] = 0; }
    modifier auth { require(wards[msg.sender] == 1, "ExponentialDecrease/not-authorized"); _; }

    // --- Data ---
    uint256 public cut; // Per-second multiplicative factor [ray]

    constructor() {
        wards[msg.sender] = 1;
        cut = 999999999999999999999999999;  // Very small decrease per second
    }

    // --- Administration ---
    function file(bytes32 what, uint256 data) external auth {
        if (what == "cut") {
            require(data < DSMath.RAY, "ExponentialDecrease/cut-too-high");
            cut = data;
        }
        else revert("ExponentialDecrease/file-unrecognized-param");
    }

    // --- Math ---
    uint256 constant RAY = 10 ** 27;
    
    function rmul(uint256 x, uint256 y) internal pure returns (uint256 z) {
        z = DSMath.add(DSMath.mul(x, y), RAY / 2) / RAY;
    }

    function rpow(uint256 x, uint256 n) internal pure returns (uint256 z) {
        z = n % 2 != 0 ? x : RAY;
        
        for (n /= 2; n != 0; n /= 2) {
            x = rmul(x, x);
            if (n % 2 != 0) {
                z = rmul(z, x);
            }
        }
    }

    // --- Pricing ---
    function price(uint256 top, uint256 dur) external view returns (uint256) {
        return rmul(top, rpow(cut, dur));
    }
}