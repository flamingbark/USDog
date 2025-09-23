// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.19;

// DSMath - Fixed point arithmetic library
// Provides basic mathematical operations with different levels of precision:
// - WAD: 18 decimal precision (10^18) - for token amounts
// - RAY: 27 decimal precision (10^27) - for rates and ratios  
// - RAD: 45 decimal precision (10^45) - for debt calculations

library DSMath {
    uint256 constant WAD = 10 ** 18;
    uint256 constant RAY = 10 ** 27;
    uint256 constant RAD = 10 ** 45;

    // --- WAD Math ---
    
    function add(uint256 x, uint256 y) internal pure returns (uint256 z) {
        require((z = x + y) >= x, "ds-math-add-overflow");
    }
    
    function sub(uint256 x, uint256 y) internal pure returns (uint256 z) {
        require((z = x - y) <= x, "ds-math-sub-underflow");
    }
    
    function mul(uint256 x, uint256 y) internal pure returns (uint256 z) {
        require(y == 0 || (z = x * y) / y == x, "ds-math-mul-overflow");
    }

    // WAD multiplication: multiply x and y, then divide by WAD
    function wmul(uint256 x, uint256 y) internal pure returns (uint256 z) {
        z = add(mul(x, y), WAD / 2) / WAD;
    }

    // WAD division: multiply x by WAD, then divide by y
    function wdiv(uint256 x, uint256 y) internal pure returns (uint256 z) {
        z = add(mul(x, WAD), y / 2) / y;
    }

    // --- RAY Math ---

    // RAY multiplication: multiply x and y, then divide by RAY
    function rmul(uint256 x, uint256 y) internal pure returns (uint256 z) {
        z = add(mul(x, y), RAY / 2) / RAY;
    }

    // RAY division: multiply x by RAY, then divide by y
    function rdiv(uint256 x, uint256 y) internal pure returns (uint256 z) {
        z = add(mul(x, RAY), y / 2) / y;
    }

    // RAY power: x^n (where n is integer)
    function rpow(uint256 x, uint256 n) internal pure returns (uint256 z) {
        z = n % 2 != 0 ? x : RAY;

        for (n /= 2; n != 0; n /= 2) {
            x = rmul(x, x);

            if (n % 2 != 0) {
                z = rmul(z, x);
            }
        }
    }

    // --- RAD Math ---

    // RAD multiplication: multiply x and y, then divide by RAD
    function radmul(uint256 x, uint256 y) internal pure returns (uint256 z) {
        z = add(mul(x, y), RAD / 2) / RAD;
    }

    // RAD division: multiply x by RAD, then divide by y  
    function raddiv(uint256 x, uint256 y) internal pure returns (uint256 z) {
        z = add(mul(x, RAD), y / 2) / y;
    }

    // --- Conversion Functions ---

    // Convert WAD to RAY (multiply by 10^9)
    function wadToRay(uint256 wad) internal pure returns (uint256 ray) {
        ray = mul(wad, 10 ** 9);
    }

    // Convert RAY to WAD (divide by 10^9)
    function rayToWad(uint256 ray) internal pure returns (uint256 wad) {
        wad = ray / 10 ** 9;
    }

    // Convert WAD to RAD (multiply by 10^27)
    function wadToRad(uint256 wad) internal pure returns (uint256 rad) {
        rad = mul(wad, 10 ** 27);
    }

    // Convert RAY to RAD (multiply by 10^18)
    function rayToRad(uint256 ray) internal pure returns (uint256 rad) {
        rad = mul(ray, 10 ** 18);
    }

    // --- Min/Max Functions ---
    
    function min(uint256 x, uint256 y) internal pure returns (uint256 z) {
        return x <= y ? x : y;
    }
    
    function max(uint256 x, uint256 y) internal pure returns (uint256 z) {
        return x >= y ? x : y;
    }
}