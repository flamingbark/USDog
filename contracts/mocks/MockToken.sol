// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.19;

// MockToken - ERC20 token for testing
// Used to simulate DOGE and SHIB tokens for testing purposes

contract MockToken {
    
    // --- ERC20 Data ---
    string  public name;
    string  public symbol;
    uint8   public constant decimals = 18;
    uint256 public totalSupply;

    mapping (address => uint256)                      public balanceOf;
    mapping (address => mapping (address => uint256)) public allowance;

    // --- Events ---
    event Approval(address indexed src, address indexed guy, uint256 wad);
    event Transfer(address indexed src, address indexed dst, uint256 wad);

    constructor(string memory name_, string memory symbol_, uint256 totalSupply_) {
        name = name_;
        symbol = symbol_;
        totalSupply = totalSupply_;
        balanceOf[msg.sender] = totalSupply_;
        emit Transfer(address(0), msg.sender, totalSupply_);
    }

    // --- Math ---
    function add(uint256 x, uint256 y) internal pure returns (uint256 z) {
        require((z = x + y) >= x);
    }
    
    function sub(uint256 x, uint256 y) internal pure returns (uint256 z) {
        require((z = x - y) <= x);
    }

    // --- Token ---
    function transfer(address dst, uint256 wad) external returns (bool) {
        return transferFrom(msg.sender, dst, wad);
    }
    
    function transferFrom(address src, address dst, uint256 wad) public returns (bool) {
        require(balanceOf[src] >= wad, "MockToken/insufficient-balance");
        
        if (src != msg.sender && allowance[src][msg.sender] != type(uint256).max) {
            require(allowance[src][msg.sender] >= wad, "MockToken/insufficient-allowance");
            allowance[src][msg.sender] = sub(allowance[src][msg.sender], wad);
        }
        
        balanceOf[src] = sub(balanceOf[src], wad);
        balanceOf[dst] = add(balanceOf[dst], wad);
        
        emit Transfer(src, dst, wad);
        return true;
    }
    
    function approve(address usr, uint256 wad) external returns (bool) {
        allowance[msg.sender][usr] = wad;
        emit Approval(msg.sender, usr, wad);
        return true;
    }

    // --- Mint for testing ---
    function mint(address usr, uint256 wad) external {
        balanceOf[usr] = add(balanceOf[usr], wad);
        totalSupply = add(totalSupply, wad);
        emit Transfer(address(0), usr, wad);
    }
}

contract MockDoge is MockToken {
    constructor() MockToken("Mock Dogecoin", "DOGE", 1000000 * 10**18) {}
}

contract MockShib is MockToken {
    constructor() MockToken("Mock Shiba Inu", "SHIB", 1000000000000 * 10**18) {}
}