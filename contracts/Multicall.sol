// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.19;

import "./lib/DSMath.sol";

// Multicall - Batch Transaction Utility
// This contract allows users to:
// - Aggregate multiple calls into single transaction
// - Gas optimization for complex operations
// - Atomic execution guarantees

contract Multicall {
    using DSMath for uint256;

    // --- Auth ---
    mapping (address => uint256) public wards;
    function rely(address usr) external auth { wards[usr] = 1; }
    function deny(address usr) external auth { wards[usr] = 0; }
    modifier auth { require(wards[msg.sender] == 1, "Multicall/not-authorized"); _; }

    uint256 public live;

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

    function cage() external auth {
        live = 0;
    }

    // --- Core Multicall Functionality ---
    struct Call {
        address target;
        bytes callData;
    }

    struct Result {
        bool success;
        bytes returnData;
    }

    // Execute multiple calls in a single transaction
    function aggregate(Call[] memory calls) public payable returns (uint256 blockNumber, bytes[] memory returnData) {
        require(live == 1, "Multicall/not-live");
        blockNumber = block.number;
        returnData = new bytes[](calls.length);
        
        for (uint256 i = 0; i < calls.length; i++) {
            (bool success, bytes memory ret) = calls[i].target.call(calls[i].callData);
            require(success, "Multicall/call-failed");
            returnData[i] = ret;
        }
    }

    // Execute multiple calls, allowing failures
    function tryAggregate(bool requireSuccess, Call[] memory calls) public payable returns (Result[] memory returnData) {
        require(live == 1, "Multicall/not-live");
        returnData = new Result[](calls.length);
        
        for (uint256 i = 0; i < calls.length; i++) {
            (bool success, bytes memory ret) = calls[i].target.call(calls[i].callData);
            if (requireSuccess) {
                require(success, "Multicall/call-failed");
            }
            returnData[i] = Result(success, ret);
        }
    }

    // Execute multiple calls and return block hash and number
    function blockAndAggregate(Call[] memory calls) public payable returns (uint256 blockNumber, bytes32 blockHash, Result[] memory returnData) {
        require(live == 1, "Multicall/not-live");
        (blockNumber, blockHash, returnData) = (block.number, blockhash(block.number), tryAggregate(true, calls));
    }

    // --- Utility Functions ---
    function getEthBalance(address addr) public view returns (uint256 balance) {
        balance = addr.balance;
    }

    function getBlockHash(uint256 blockNumber) public view returns (bytes32 blockHash) {
        blockHash = blockhash(blockNumber);
    }

    function getLastBlockHash() public view returns (bytes32 blockHash) {
        blockHash = blockhash(block.number - 1);
    }

    function getCurrentBlockTimestamp() public view returns (uint256 timestamp) {
        timestamp = block.timestamp;
    }

    function getCurrentBlockDifficulty() public view returns (uint256 difficulty) {
        difficulty = block.difficulty;
    }

    function getCurrentBlockGasLimit() public view returns (uint256 gaslimit) {
        gaslimit = block.gaslimit;
    }

    function getCurrentBlockCoinbase() public view returns (address coinbase) {
        coinbase = block.coinbase;
    }

    // --- Static Call Functions ---
    function getBlockNumber() public view returns (uint256 blockNumber) {
        blockNumber = block.number;
    }

    function getChainId() public view returns (uint256 chainid) {
        chainid = block.chainid;
    }

    // --- Helper Functions for DeFi Operations ---
    
    // Helper to encode function calls
    function encodeCall(address target, bytes memory data) public pure returns (Call memory) {
        return Call(target, data);
    }

    // Helper to decode return data
    function decodeUint256(bytes memory data) public pure returns (uint256) {
        return abi.decode(data, (uint256));
    }

    function decodeAddress(bytes memory data) public pure returns (address) {
        return abi.decode(data, (address));
    }

    function decodeBool(bytes memory data) public pure returns (bool) {
        return abi.decode(data, (bool));
    }

    // Helper to create common CDP operations batch
    function createCDPBatch(
        address user,
        address vatAddr,
        address gemJoinAddr,
        address daiJoinAddr,
        bytes32 ilk,
        uint256 collateralAmount,
        uint256 daiAmount
    ) external pure returns (Call[] memory calls) {
        calls = new Call[](4);
        
        // 1. Transfer collateral to GemJoin
        calls[0] = Call(
            gemJoinAddr,
            abi.encodeWithSignature("join(address,uint256)", user, collateralAmount)
        );
        
        // 2. Lock collateral and draw Dai
        calls[1] = Call(
            vatAddr,
            abi.encodeWithSignature("frob(bytes32,address,address,address,int256,int256)",
                ilk, user, user, user, int256(collateralAmount), int256(daiAmount))
        );
        
        // 3. Move Dai from Vat to DaiJoin
        calls[2] = Call(
            vatAddr,
            abi.encodeWithSignature("move(address,address,uint256)",
                user, daiJoinAddr, daiAmount * 10**27)
        );
        
        // 4. Exit Dai tokens
        calls[3] = Call(
            daiJoinAddr,
            abi.encodeWithSignature("exit(address,uint256)", user, daiAmount)
        );
    }

    // Fallback function to accept ETH
    receive() external payable {}
    fallback() external payable {}
}