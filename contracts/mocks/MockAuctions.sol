// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.19;

// Minimal mocks to satisfy Vow.cage() dependencies in tests

// FlapLike requires cage(uint256)
contract MockFlapper {
    event Caged(uint256 amount);
    function cage(uint256 amount) external {
        emit Caged(amount);
    }
}

// FlopLike requires cage()
contract MockFlopper {
    event Caged();
    function cage() external {
        emit Caged();
    }
}