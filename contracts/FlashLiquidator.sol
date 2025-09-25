// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.19;

import "./lib/DSMath.sol";

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function decimals() external view returns (uint8);
}

interface VatLike {
    function move(address, address, uint256) external;
    function dai(address) external view returns (uint256);
}

interface DaiJoinLike {
    function join(address, uint256) external;
    function exit(address, uint256) external;
}

interface GemJoinLike {
    function join(address, uint256) external;
    function exit(address, uint256) external;
    function gem() external view returns (address);
}

interface ClipperLike {
    function take(uint256, uint256, uint256, address, bytes calldata) external;
}

interface IPancakeRouter {
    function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts);
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}

interface IPancakePair {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external;
}

// Flash Liquidator for DOGE/SHIB Stablecoin System
// Implements ClipperCalleeFunction to enable flash liquidations
// Uses PancakeSwap for flash loans and token swaps
contract FlashLiquidator {
    using DSMath for uint256;

    // --- Auth ---
    mapping (address => uint256) public wards;
    function rely(address usr) external auth { wards[usr] = 1; }
    function deny(address usr) external auth { wards[usr] = 0; }
    modifier auth { require(wards[msg.sender] == 1, "FlashLiquidator/not-authorized"); _; }

    // --- Core Contracts ---
    VatLike public immutable vat;
    DaiJoinLike public immutable daiJoin;
    IERC20 public immutable dai;

    // --- PancakeSwap ---
    IPancakeRouter public constant router = IPancakeRouter(0x10ED43C718714eb63d5aA57B78B54704E256024E);
    address public constant WBNB = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c;

    // --- Supported Tokens ---
    mapping(address => bool) public supportedCollateral;
    mapping(address => address) public collateralJoins; // collateral -> join contract

    // --- Flash Loan State ---
    struct FlashLoanData {
        address borrower;
        address collateralToken;
        address collateralJoin;
        uint256 repayAmount;
        uint256 expectedCollateral;
        bool inFlashLoan;
    }

    FlashLoanData private flashLoanState;

    // --- Events ---
    event FlashLiquidation(
        address indexed borrower,
        address indexed collateralToken,
        uint256 repayAmount,
        uint256 collateralReceived,
        uint256 profit
    );

    event CollateralAdded(address indexed token, address indexed join);
    event EmergencyWithdraw(address indexed token, uint256 amount);

    // --- Init ---
    constructor(address vat_, address daiJoin_) {
        wards[msg.sender] = 1;
        vat = VatLike(vat_);
        daiJoin = DaiJoinLike(daiJoin_);
        dai = IERC20(0xB1abd2A64b829596D7AfEFCA31a6C984B5AFaafB); // Deployed stablecoin
    }

    // --- Administration ---
    function addCollateral(address token, address join) external auth {
        supportedCollateral[token] = true;
        collateralJoins[token] = join;
        emit CollateralAdded(token, join);
    }

    function removeCollateral(address token) external auth {
        supportedCollateral[token] = false;
        delete collateralJoins[token];
    }

    // --- Main Flash Liquidation Function ---
    function liquidateMemeCollateral(
        address borrower,
        address collateralVToken,  // Not used in this implementation
        address debtVToken,        // Not used in this implementation
        uint256 repayAmount,
        address flashLoanPool
    ) external {
        require(!flashLoanState.inFlashLoan, "FlashLiquidator/already-in-flash-loan");

        // Get collateral token from pool
        IPancakePair pair = IPancakePair(flashLoanPool);
        address token0 = pair.token0();
        address token1 = pair.token1();

        // Determine which token is DAI/stablecoin and which is collateral
        address collateralToken;
        if (token0 == address(dai)) {
            collateralToken = token1;
        } else if (token1 == address(dai)) {
            collateralToken = token0;
        } else {
            // Neither token is DAI, this is a collateral-WBNB pair
            // We'll need to determine collateral based on supported list
            if (supportedCollateral[token0]) {
                collateralToken = token0;
            } else if (supportedCollateral[token1]) {
                collateralToken = token1;
            } else {
                revert("FlashLiquidator/unsupported-collateral");
            }
        }

        require(supportedCollateral[collateralToken], "FlashLiquidator/unsupported-collateral");

        // Set up flash loan state
        flashLoanState = FlashLoanData({
            borrower: borrower,
            collateralToken: collateralToken,
            collateralJoin: collateralJoins[collateralToken],
            repayAmount: repayAmount,
            expectedCollateral: 0, // Will be calculated
            inFlashLoan: true
        });

        // Calculate how much DAI we need for the liquidation
        uint256 flashAmount = repayAmount / 1e18; // Convert from rad to wad

        // Initiate flash loan by calling swap with data
        bytes memory data = abi.encode(borrower, collateralToken, repayAmount);

        // Determine swap amounts based on pair configuration
        if (token0 == address(dai)) {
            pair.swap(flashAmount, 0, address(this), data);
        } else if (token1 == address(dai)) {
            pair.swap(0, flashAmount, address(this), data);
        } else {
            // For collateral-WBNB pairs, we need to flash WBNB first
            // then swap to DAI in the callback
            uint256 wbnbAmount = getWBNBForDAI(flashAmount);
            if (token0 == WBNB) {
                pair.swap(wbnbAmount, 0, address(this), data);
            } else {
                pair.swap(0, wbnbAmount, address(this), data);
            }
        }
    }

    // --- PancakeSwap Flash Loan Callback ---
    function pancakeCall(address sender, uint256 amount0, uint256 amount1, bytes calldata data) external {
        require(flashLoanState.inFlashLoan, "FlashLiquidator/not-in-flash-loan");

        // Verify caller is a legitimate PancakeSwap pair
        address token0 = IPancakePair(msg.sender).token0();
        address token1 = IPancakePair(msg.sender).token1();
        require(msg.sender == pairFor(token0, token1), "FlashLiquidator/invalid-pair");

        (address borrower, address collateralToken, uint256 repayAmount) = abi.decode(data, (address, address, uint256));

        uint256 flashAmount = amount0 > 0 ? amount0 : amount1;

        // If we flashed WBNB, swap it to DAI first
        if ((amount0 > 0 && token0 == WBNB) || (amount1 > 0 && token1 == WBNB)) {
            // Swap WBNB to DAI
            address[] memory path = new address[](2);
            path[0] = WBNB;
            path[1] = address(dai);

            IERC20(WBNB).approve(address(router), flashAmount);
            uint256[] memory amounts = router.swapExactTokensForTokens(
                flashAmount,
                0, // Accept any amount of DAI
                path,
                address(this),
                block.timestamp + 300
            );
            flashAmount = amounts[1]; // Update to DAI amount received
        }

        // Convert DAI to internal DAI for liquidation
        dai.approve(address(daiJoin), flashAmount);
        daiJoin.join(address(this), flashAmount);

        // Perform the liquidation by calling clipper
        // This will trigger clipperCall which handles the actual liquidation
        executeClipperLiquidation(borrower, collateralToken, repayAmount);

        // Calculate repayment with fee (0.3% PancakeSwap fee)
        uint256 repaymentAmount = flashAmount * 1003 / 1000;

        // Ensure we have enough DAI to repay
        uint256 daiBalance = dai.balanceOf(address(this));
        require(daiBalance >= repaymentAmount, "FlashLiquidator/insufficient-repayment");

        // Repay the flash loan
        if (token0 == address(dai)) {
            dai.transfer(msg.sender, repaymentAmount);
        } else if (token1 == address(dai)) {
            dai.transfer(msg.sender, repaymentAmount);
        } else {
            // Need to swap DAI back to WBNB for repayment
            address[] memory path = new address[](2);
            path[0] = address(dai);
            path[1] = WBNB;

            dai.approve(address(router), repaymentAmount);
            router.swapExactTokensForTokens(
                repaymentAmount,
                0,
                path,
                msg.sender,
                block.timestamp + 300
            );
        }

        // Calculate and emit profit
        uint256 finalBalance = dai.balanceOf(address(this));
        uint256 profit = finalBalance > daiBalance - repaymentAmount ?
            finalBalance - (daiBalance - repaymentAmount) : 0;

        emit FlashLiquidation(borrower, collateralToken, repayAmount, flashLoanState.expectedCollateral, profit);

        // Clear flash loan state
        delete flashLoanState;
    }

    // --- Clipper Callback (called during auction participation) ---
    function clipperCall(address sender, uint256 owe, uint256 slice, bytes calldata data) external {
        // This is called by the Clipper when we participate in an auction
        // owe: DAI amount we owe for the collateral
        // slice: collateral amount we're receiving

        require(flashLoanState.inFlashLoan, "FlashLiquidator/not-in-flash-loan");

        // Extract collateral from the contract and convert to external tokens
        GemJoinLike collateralJoin = GemJoinLike(flashLoanState.collateralJoin);
        collateralJoin.exit(address(this), slice);

        // Swap collateral to DAI via PancakeSwap
        IERC20 collateralToken = IERC20(flashLoanState.collateralToken);
        uint256 collateralBalance = collateralToken.balanceOf(address(this));

        if (collateralBalance > 0) {
            // Determine swap path
            address[] memory path;
            if (flashLoanState.collateralToken == WBNB) {
                path = new address[](2);
                path[0] = flashLoanState.collateralToken;
                path[1] = address(dai);
            } else {
                path = new address[](3);
                path[0] = flashLoanState.collateralToken;
                path[1] = WBNB;
                path[2] = address(dai);
            }

            collateralToken.approve(address(router), collateralBalance);
            router.swapExactTokensForTokens(
                collateralBalance,
                0, // Accept any amount of DAI (market rate)
                path,
                address(this),
                block.timestamp + 300
            );
        }

        flashLoanState.expectedCollateral = slice;
    }

    // --- Helper Functions ---
    function executeClipperLiquidation(address borrower, address collateralToken, uint256 repayAmount) internal {
        // This would interact with the Dog/Clipper system to perform liquidation
        // For now, this is a placeholder - would need specific clipper address and auction ID
        // The actual implementation would call Dog.bark() then Clipper.take()

        // Placeholder: assume we somehow trigger the liquidation and get collateral
        // In real implementation, this would be more complex and require integration
        // with the specific Dog/Clipper contracts for this collateral type
    }

    function getWBNBForDAI(uint256 daiAmount) internal view returns (uint256) {
        address[] memory path = new address[](2);
        path[0] = WBNB;
        path[1] = address(dai);

        uint256[] memory amounts = router.getAmountsOut(daiAmount, path);
        return amounts[0];
    }

    function pairFor(address tokenA, address tokenB) internal pure returns (address pair) {
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        pair = address(uint160(uint256(keccak256(abi.encodePacked(
                hex'ff',
                0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73, // PancakeSwap Factory
                keccak256(abi.encodePacked(token0, token1)),
                hex'00fb7f630766e6a796048ea87d01acd3068e8ff67d078148a3fa3f4a84f69bd5' // init code hash
            )))));
    }

    // --- Estimation Functions ---
    function estimateLiquidationProfit(
        address borrower,
        address collateralVToken,
        address debtVToken,
        uint256 repayAmount
    ) external view returns (uint256 estimatedProfit, bool isViable) {
        // Simplified profit estimation
        // In practice, this would calculate:
        // 1. Expected collateral from liquidation (with liquidation bonus)
        // 2. Expected DAI from selling collateral
        // 3. Flash loan fees
        // 4. Gas costs

        // Placeholder implementation
        estimatedProfit = repayAmount / 20; // Assume 5% profit
        isViable = estimatedProfit > 50 ether; // Minimum $50 profit threshold
    }

    function getCollateralHealthFactor(address borrower) external view returns (uint256) {
        // Would calculate health factor from Vat contract
        // Placeholder: return a sample health factor
        return 1.5 ether; // 150% health factor
    }

    // --- Emergency Functions ---
    function emergencyWithdraw(address token, uint256 amount) external auth {
        IERC20(token).transfer(msg.sender, amount);
        emit EmergencyWithdraw(token, amount);
    }

    function emergencyWithdrawInternal(uint256 amount) external auth {
        vat.move(address(this), msg.sender, amount);
    }

    // --- View Functions ---
    function getFlashLoanState() external view returns (FlashLoanData memory) {
        return flashLoanState;
    }
}