// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.19;

import "./lib/DSMath.sol";
import "@api3/contracts/interfaces/IApi3ReaderProxy.sol";

// Base Price Feed Contract
// This can be extended for different oracle implementations
contract PriceFeed {
    using DSMath for uint256;

    // --- Auth ---
    mapping (address => uint256) public wards;
    function rely(address usr) external auth { wards[usr] = 1; }
    function deny(address usr) external auth { wards[usr] = 0; }
    modifier auth { require(wards[msg.sender] == 1, "PriceFeed/not-authorized"); _; }

    // --- Data ---
    uint128 public val; // Price [wad]
    uint32  public zzz; // Time of last update

    // --- Events ---
    event LogValue(bytes32 val);

    constructor() {
        wards[msg.sender] = 1;
    }

    // --- Main ---
    function peek() public view returns (bytes32, bool) {
        return (bytes32(uint256(val)), val > 0);
    }

    function read() external view returns (bytes32) {
        bytes32 wut; bool haz;
        (wut, haz) = peek();
        require(haz, "PriceFeed/invalid-price-feed");
        return wut;
    }

    // --- Auth ---
    function poke(uint128 wut) external auth {
        val = wut;
        zzz = uint32(block.timestamp);
        emit LogValue(bytes32(uint256(wut)));
    }

    function void() external auth {
        val = 0;
        zzz = uint32(block.timestamp);
        emit LogValue(bytes32(0));
    }
}

// Chainlink Price Feed Adapter
// This adapts Chainlink price feeds to our interface
interface AggregatorV3Interface {
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
    function decimals() external view returns (uint8);
}

contract ChainlinkPriceFeed {
    
    // --- Auth ---
    mapping (address => uint256) public wards;
    function rely(address usr) external auth { wards[usr] = 1; }
    function deny(address usr) external auth { wards[usr] = 0; }
    modifier auth { require(wards[msg.sender] == 1, "ChainlinkPriceFeed/not-authorized"); _; }

    AggregatorV3Interface internal priceFeed;
    uint8 public feedDecimals;
    uint256 public stalePeriod; // Max age of price data in seconds

    constructor(address _priceFeed) {
        wards[msg.sender] = 1;
        priceFeed = AggregatorV3Interface(_priceFeed);
        feedDecimals = priceFeed.decimals();
        stalePeriod = 3600; // 1 hour default
    }

    function setStalePeriod(uint256 _stalePeriod) external auth {
        stalePeriod = _stalePeriod;
    }

    function peek() public view returns (bytes32, bool) {
        try priceFeed.latestRoundData() returns (
            uint80,
            int256 price,
            uint256,
            uint256 updatedAt,
            uint80
        ) {
            // Check if price is positive and not stale
            bool isValid = price > 0 && block.timestamp - updatedAt <= stalePeriod;
            
            if (isValid) {
                // Convert to WAD (18 decimals)
                uint256 normalizedPrice;
                if (feedDecimals < 18) {
                    normalizedPrice = uint256(price) * (10 ** (18 - feedDecimals));
                } else if (feedDecimals > 18) {
                    normalizedPrice = uint256(price) / (10 ** (feedDecimals - 18));
                } else {
                    normalizedPrice = uint256(price);
                }
                return (bytes32(normalizedPrice), true);
            }
        } catch {
            // If any error occurs, return invalid
        }
        return (bytes32(0), false);
    }

    function read() external view returns (bytes32) {
        (bytes32 price, bool valid) = peek();
        require(valid, "ChainlinkPriceFeed/invalid-price-feed");
        return price;
    }
}

// API3 Price Feed Adapter
contract Api3PriceFeed {

    // --- Auth ---
    mapping (address => uint256) public wards;
    function rely(address usr) external auth { wards[usr] = 1; }
    function deny(address usr) external auth { wards[usr] = 0; }
    modifier auth { require(wards[msg.sender] == 1, "Api3PriceFeed/not-authorized"); _; }

    IApi3ReaderProxy internal priceFeed;
    uint256 public stalePeriod; // Max age of price data in seconds

    constructor(address _priceFeed) {
        wards[msg.sender] = 1;
        priceFeed = IApi3ReaderProxy(_priceFeed);
        stalePeriod = 3600; // 1 hour default
    }

    function setStalePeriod(uint256 _stalePeriod) external auth {
        stalePeriod = _stalePeriod;
    }

    function peek() public view returns (bytes32, bool) {
        try priceFeed.read() returns (int224 price, uint32 timestamp) {
            // Check if price is positive and not stale
            bool isValid = price > 0 && block.timestamp - timestamp <= stalePeriod;

            if (isValid) {
                // API3 prices are in 18 decimals, cast to uint256
                return (bytes32(uint256(uint224(price))), true);
            }
        } catch {
            // If any error occurs, return invalid
        }
        return (bytes32(0), false);
    }

    function read() external view returns (bytes32) {
        (bytes32 price, bool valid) = peek();
        require(valid, "Api3PriceFeed/invalid-price-feed");
        return price;
    }
}

// Mock Price Feeds for Testing
contract DogePriceFeed is PriceFeed {
    constructor() PriceFeed() {
        // Initialize with $0.10 per DOGE (in WAD format)
        val = 100000000000000000; // 0.1 * 10^18
        zzz = uint32(block.timestamp);
    }
}

contract ShibPriceFeed is PriceFeed {
    constructor() PriceFeed() {
        // Initialize with $0.00001 per SHIB (in WAD format) 
        val = 10000000000000; // 0.00001 * 10^18
        zzz = uint32(block.timestamp);
    }
}

// Median Price Feed - Aggregates multiple price sources
contract MedianPriceFeed {
    
    // --- Auth ---
    mapping (address => uint256) public wards;
    function rely(address usr) external auth { wards[usr] = 1; }
    function deny(address usr) external auth { wards[usr] = 0; }
    modifier auth { require(wards[msg.sender] == 1, "MedianPriceFeed/not-authorized"); _; }

    // --- Data ---
    uint128 public val;
    uint32  public age;
    bytes32 public wat;
    uint256 public bar = 1;

    // Price sources
    address[] public oracles;
    mapping (address => uint256) public slot;

    constructor(bytes32 wat_) {
        wards[msg.sender] = 1;
        wat = wat_;
    }

    function lift(address[] calldata a) external auth {
        for (uint256 i = 0; i < a.length; i++) {
            require(a[i] != address(0), "MedianPriceFeed/no-contract-0");
            slot[a[i]] = i + 1;
        }
        oracles = a;
    }

    function drop(address[] calldata a) external auth {
        for (uint256 i = 0; i < a.length; i++) {
            slot[a[i]] = 0;
        }
    }

    function setBar(uint256 bar_) external auth {
        require(bar_ > 0, "MedianPriceFeed/quorum-is-zero");
        require(bar_ % 2 != 0, "MedianPriceFeed/quorum-not-odd-number");
        bar = bar_;
    }

    function peek() external view returns (bytes32, bool) {
        return (bytes32(uint256(val)), val > 0);
    }

    function read() external view returns (bytes32) {
        require(val > 0, "MedianPriceFeed/invalid-price-feed");
        return bytes32(uint256(val));
    }

    function poke() external {
        (val, age) = compute();
    }

    function compute() public view returns (uint128, uint32) {
        require(oracles.length >= bar, "MedianPriceFeed/not-enough-feeds");

        uint256[] memory prices = new uint256[](oracles.length);
        uint256 validPrices = 0;

        for (uint256 i = 0; i < oracles.length; i++) {
            try PriceFeed(oracles[i]).peek() returns (bytes32 price, bool valid) {
                if (valid) {
                    prices[validPrices] = uint256(price);
                    validPrices++;
                }
            } catch {
                // Skip invalid feeds
            }
        }

        require(validPrices >= bar, "MedianPriceFeed/not-enough-valid-feeds");

        // Sort prices array (simple bubble sort for small arrays)
        for (uint256 i = 0; i < validPrices - 1; i++) {
            for (uint256 j = 0; j < validPrices - i - 1; j++) {
                if (prices[j] > prices[j + 1]) {
                    uint256 temp = prices[j];
                    prices[j] = prices[j + 1];
                    prices[j + 1] = temp;
                }
            }
        }

        // Return median
        uint256 medianPrice = validPrices % 2 == 0 
            ? (prices[validPrices / 2 - 1] + prices[validPrices / 2]) / 2
            : prices[validPrices / 2];

        return (uint128(medianPrice), uint32(block.timestamp));
    }
}