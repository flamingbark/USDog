// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.19;

import "./lib/DSMath.sol";

interface VatLike {
    function slip(bytes32, address, int256) external;
    function move(address, address, uint256) external;
}

interface GemLike {
    function decimals() external view returns (uint8);
    function transfer(address, uint256) external returns (bool);
    function transferFrom(address, address, uint256) external returns (bool);
    function balanceOf(address) external view returns (uint256);
}

interface StableCoinLike {
    function mint(address, uint256) external;
    function burn(address, uint256) external;
}

// GemJoin - Adapter for ERC20 collateral tokens (DOGE, SHIB)
// This contract handles deposits and withdrawals of collateral tokens
contract GemJoin {
    using DSMath for uint256;

    // --- Auth ---
    mapping (address => uint256) public wards;
    function rely(address usr) external auth { wards[usr] = 1; }
    function deny(address usr) external auth { wards[usr] = 0; }
    modifier auth { require(wards[msg.sender] == 1, "GemJoin/not-authorized"); _; }

    VatLike public vat;   // CDP Engine
    bytes32 public ilk;   // Collateral Type
    GemLike public gem;   // Collateral Token
    uint256 public dec;   // Token Decimals
    uint256 public live;  // Access Flag

    constructor(address vat_, bytes32 ilk_, address gem_) {
        wards[msg.sender] = 1;
        live = 1;
        vat = VatLike(vat_);
        ilk = ilk_;
        gem = GemLike(gem_);
        dec = gem.decimals();
    }

    function cage() external auth {
        live = 0;
    }

    function join(address usr, uint256 wad) external {
        require(live == 1, "GemJoin/not-live");
        require(int256(wad) >= 0, "GemJoin/overflow");
        uint256 wad18 = wad * (10 ** (18 - dec)); // Convert token decimals to WAD (18 decimals)
        vat.slip(ilk, usr, int256(wad18));
        require(gem.transferFrom(msg.sender, address(this), wad), "GemJoin/failed-transfer");
    }

    function exit(address usr, uint256 wad) external {
        require(wad <= 2 ** 255, "GemJoin/overflow");
        uint256 wad18 = wad * (10 ** (18 - dec)); // Convert token decimals to WAD (18 decimals)
        vat.slip(ilk, msg.sender, -int256(wad18));
        require(gem.transfer(usr, wad), "GemJoin/failed-transfer");
    }
}

// DaiJoin - Adapter for the stablecoin token
// This contract handles minting and burning of the stablecoin
contract DaiJoin {
    using DSMath for uint256;

    // --- Auth ---
    mapping (address => uint256) public wards;
    function rely(address usr) external auth { wards[usr] = 1; }
    function deny(address usr) external auth { wards[usr] = 0; }
    modifier auth { require(wards[msg.sender] == 1, "DaiJoin/not-authorized"); _; }

    VatLike public vat;        // CDP Engine
    StableCoinLike public dai; // Stablecoin Token
    uint256 public live;       // Access Flag

    constructor(address vat_, address dai_) {
        wards[msg.sender] = 1;
        live = 1;
        vat = VatLike(vat_);
        dai = StableCoinLike(dai_);
    }

    function cage() external auth {
        live = 0;
    }

    uint256 constant ONE = 10 ** 27;

    function join(address usr, uint256 wad) external {
        vat.move(address(this), usr, wad.mul(ONE));
        dai.burn(msg.sender, wad);
    }

    function exit(address usr, uint256 wad) external {
        require(live == 1, "DaiJoin/not-live");
        vat.move(msg.sender, address(this), wad.mul(ONE));
        dai.mint(usr, wad);
    }
}

// DogeJoin - Specialized GemJoin for Dogecoin collateral
contract DogeJoin is GemJoin {
    constructor(address vat_, address doge_)
        GemJoin(vat_, bytes32("DOGE-A"), doge_) {}
}

// ShibJoin - Specialized GemJoin for Shiba Inu collateral
contract ShibJoin is GemJoin {
    constructor(address vat_, address shib_)
        GemJoin(vat_, bytes32("SHIB-A"), shib_) {}
}