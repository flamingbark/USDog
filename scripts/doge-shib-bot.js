'use strict';

require('dotenv').config();
const DRY_RUN = (process.env.DRY_RUN || 'true') === 'true';

const { ethers } = require('ethers');
const { ChainId, Token, WETH, Fetcher, Trade, Route, TokenAmount, TradeType } = require('@pancakeswap-libs/sdk');

// DOGE/SHIB specific configuration
const config = {
    // Network settings
    BSC_RPC_URL: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/',
    BSC_WSS_URL: process.env.BSC_WSS_URL || 'wss://bsc-ws-node.nariox.org:443',
    PRIVATE_KEY: process.env.PRIVATE_KEY,

    // Contract addresses
    LIQUIDATION_BOT_CONTRACT: process.env.DOGE_SHIB_BOT_CONTRACT,
    SPOT_ADDRESS: process.env.SPOT_ADDRESS || '0x5f029d9b48162a809919e595c2b712f5cb039d19',
    ILKS: {
        DOGE: ethers.utils.formatBytes32String('DOGE-A'),
        SHIB: ethers.utils.formatBytes32String('SHIB-A'),
    },

    // Venus Protocol
    VENUS_COMPTROLLER: '0xfD36E2c2a6789Db23113685031d7F16329158384',
    VENUS_PRICE_ORACLE: '0xd8B6dA2bfEC71D684D3E2a2FC9492dDad5C3787F',

    // Meme tokens on BSC
    MEME_TOKENS: {
        DOGE: {
            address: '0xbA2aE424d960c26247Dd6c32edC70B295c744C43',
            vToken: '0xec3422Ef92B2fb59e84c8B02Ba73F1fE84Ed8D71',
            decimals: 8,
            symbol: 'DOGE',
            minLiquidationUSD: 1000,
            volatilityMultiplier: 1.5,
            liquidationThreshold: 0.6
        },
        SHIB: {
            address: '0x2859e4544C4bB03966803b044A93563Bd2D0DD4D',
            vToken: '0x9A0AF7FDb2065Ce011584240fA9E6D6eA0C80278',
            decimals: 18,
            symbol: 'SHIB',
            minLiquidationUSD: 500,
            volatilityMultiplier: 2.0,
            liquidationThreshold: 0.5
        }
    },

    // Debt tokens (stablecoins)
    STABLECOINS: {
        USDT: {
            address: '0x55d398326f99059fF775485246999027B3197955',
            vToken: '0xfD5840Cd36d94D7229439859C0112a4185BC0255',
            decimals: 18,
            symbol: 'USDT'
        },
        BUSD: {
            address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
            vToken: '0x95c78222B3D6e262426483D42CfA53685A67Ab9D',
            decimals: 18,
            symbol: 'BUSD'
        },
        USDC: {
            address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
            vToken: '0xecA88125a5ADbe82614ffC12D0DB554E2e2867C8',
            decimals: 18,
            symbol: 'USDC'
        }
    },

    // PancakeSwap settings
    PANCAKE_ROUTER: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    WBNB: '0xbb4CdB9CBd36B01bD1cBaeBF2De08d9173bc095c',

    // Flash loan pools (need to be updated with actual addresses)
    FLASH_LOAN_POOLS: {
        'DOGE-WBNB': '0x0000000000000000000000000000000000000001',
        'SHIB-WBNB': '0x0000000000000000000000000000000000000002',
        'WBNB-USDT': '0x36696169C63e42cd08ce11f5deeBbCeBae652050',
        'WBNB-BUSD': '0x7EFaEf62fDdCCa950418312c6C91Aef321375A00'
    },

    // Bot specific settings for meme tokens
    MONITORING_INTERVAL: 3000,
    HEALTH_FACTOR_ALERT: ethers.utils.parseEther('1.1'),
    HEALTH_FACTOR_LIQUIDATION: ethers.utils.parseEther('1.0'),
    MAX_GAS_PRICE: ethers.utils.parseUnits('25', 'gwei'),
    SLIPPAGE_TOLERANCE: 500,

    // Risk management for volatile assets
    MAX_SINGLE_LIQUIDATION_USD: 10000,
    DAILY_LIQUIDATION_LIMIT_USD: 100000,
    PRICE_IMPACT_LIMIT: 300,

    // Profit thresholds
    MIN_PROFIT_THRESHOLD_USD: 50,
    TARGET_PROFIT_MARGIN: 0.15
};

// Simplified ABIs
const DOGE_SHIB_BOT_ABI = [
    'function liquidateMemeCollateral(address borrower, address collateralVToken, address debtVToken, uint256 repayAmount, address flashLoanPool) external',
    'function estimateLiquidationProfit(address borrower, address collateralVToken, address debtVToken, uint256 repayAmount) external view returns (uint256 estimatedProfit, bool isViable)',
    'function getCollateralHealthFactor(address borrower) external view returns (uint256)',
    'function emergencyWithdraw(address token, uint256 amount) external'
];

const VENUS_COMPTROLLER_ABI = [
    'function getAllMarkets() external view returns (address[] memory)',
    'function getAccountLiquidity(address account) external view returns (uint256 error, uint256 liquidity, uint256 shortfall)',
    'function liquidationIncentiveMantissa() external view returns (uint256)'
];

const VTOKEN_ABI = [
    'function borrowBalanceStored(address account) external view returns (uint256)',
    'function balanceOfUnderlying(address account) external view returns (uint256)',
    'function exchangeRateStored() external view returns (uint256)',
    'function underlying() external view returns (address)',
    'function getAccountSnapshot(address account) external view returns (uint256 error, uint256 vTokenBalance, uint256 borrowBalance, uint256 exchangeRate)'
];

const ERC20_ABI = [
    'function balanceOf(address account) external view returns (uint256)',
    'function decimals() external view returns (uint8)',
    'function symbol() external view returns (string)',
    'function transfer(address to, uint256 amount) external returns (bool)'
];

const SPOT_ABI = [
    'function ilks(bytes32) view returns (address pip, uint256 mat)'
];

const PRICE_FEED_ABI = [
    'function peek() view returns (bytes32, bool)'
];

class DogeShiBLiquidationBot {
    constructor() {
        if (!config.PRIVATE_KEY) {
            throw new Error('PRIVATE_KEY is required in .env');
        }
        if (!config.LIQUIDATION_BOT_CONTRACT && !DRY_RUN) {
            console.error('DOGE_SHIB_BOT_CONTRACT is not set. Set it in .env or run with DRY_RUN=true');
            process.exit(1);
        }

        this.provider = new ethers.providers.JsonRpcProvider(config.BSC_RPC_URL);

        // Optional WebSocket provider with safe fallback (skip in DRY_RUN)
        this.wsProvider = null;
        if (!DRY_RUN && config.BSC_WSS_URL) {
            try {
                this.wsProvider = new ethers.providers.WebSocketProvider(config.BSC_WSS_URL);
                const ws = this.wsProvider._websocket;
                if (ws && typeof ws.on === 'function') {
                    ws.on('error', (err) => console.error('WebSocket error:', (err && err.message) || err));
                    ws.on('close', (code, reason) => {
                        console.warn(`WebSocket closed: ${code} ${reason ? reason.toString() : ''}`);
                        this.wsProvider = null;
                    });
                }
            } catch (err) {
                console.warn('Failed to initialize WebSocketProvider, continuing with polling only:', (err && err.message) || err);
                this.wsProvider = null;
            }
        } else {
            console.log('WebSocket disabled (DRY_RUN or missing BSC_WSS_URL). Using polling only.');
        }

        this.wallet = new ethers.Wallet(config.PRIVATE_KEY, this.provider);

        if (DRY_RUN || !config.LIQUIDATION_BOT_CONTRACT) {
            console.log('🧪 DRY_RUN enabled: on-chain execution disabled');
            const zero = ethers.BigNumber.from(0);
            this.liquidationBot = {
                estimateLiquidationProfit: async () => [zero, false],
                getCollateralHealthFactor: async () => ethers.utils.parseEther('2.0'),
                on: () => {}
            };
        } else {
            this.liquidationBot = new ethers.Contract(
                config.LIQUIDATION_BOT_CONTRACT,
                DOGE_SHIB_BOT_ABI,
                this.wallet
            );
        }

        this.comptroller = new ethers.Contract(
            config.VENUS_COMPTROLLER,
            VENUS_COMPTROLLER_ABI,
            this.provider
        );

        // Spot contract to read current pip addresses used by the stablecoin system
        this.spot = new ethers.Contract(
            config.SPOT_ADDRESS,
            SPOT_ABI,
            this.provider
        );

        this.monitoredPositions = new Map();
        this.liquidationHistory = new Map();
        this.dailyStats = {
            liquidationsExecuted: 0,
            totalVolume: ethers.BigNumber.from(0),
            totalProfit: ethers.BigNumber.from(0),
            lastReset: Date.now()
        };

        this.isRunning = false;
        this.priceCache = new Map();

        console.log('🐕 DOGE/SHIB Flash Liquidation Bot initialized');
        console.log('📍 Wallet address:', this.wallet.address);
        console.log('🎯 Monitoring meme token collateral liquidations');
    }

    async start() {
       console.log('🚀 Starting DOGE/SHIB liquidation monitoring...');
       this.isRunning = true;
       await this.initializePriceFeeds();
       this.monitorMemeTokenPositions();
       this.monitorPriceMovements();
       this.setupEventListeners();
       setInterval(() => this.updateDailyStats(), 60000);
       setInterval(() => this.cleanupOldData(), 3600000);
    }

    async stop() {
        console.log('🛑 Stopping DOGE/SHIB liquidation bot...');
        this.isRunning = false;
        if (this.wsProvider && this.wsProvider.destroy) {
            await this.wsProvider.destroy();
        }
    }

    async initializePriceFeeds() {
        console.log('💰 Initializing price feeds for DOGE/SHIB...');
        for (const [symbol, token] of Object.entries(config.MEME_TOKENS)) {
            try {
                const price = await this.getStablecoinPriceBySymbol(symbol);
                this.priceCache.set(symbol, {
                    price: price,
                    timestamp: Date.now(),
                    volatility: token.volatilityMultiplier
                });
                console.log(`📊 ${symbol} price: $${ethers.utils.formatUnits(price, 18)}`);
            } catch (error) {
                console.error(`❌ Failed to get ${symbol} price:`, error);
            }
        }
    }

    async monitorMemeTokenPositions() {
        while (this.isRunning) {
            try {
                await this.scanForMemeTokenLiquidations();
                await this.sleep(config.MONITORING_INTERVAL);
            } catch (error) {
                console.error('❌ Error in meme token monitoring:', error);
                await this.sleep(config.MONITORING_INTERVAL * 2);
            }
        }
    }

    async scanForMemeTokenLiquidations() {
        console.log('🔍 Scanning for DOGE/SHIB liquidation opportunities...');
        for (const [symbol, token] of Object.entries(config.MEME_TOKENS)) {
            await this.checkMemeTokenMarket(symbol, token);
        }
        for (const [positionKey, position] of this.monitoredPositions) {
            await this.evaluatePosition(positionKey, position);
        }
    }

    async checkMemeTokenMarket(symbol, token) {
        try {
            const vToken = new ethers.Contract(token.vToken, VTOKEN_ABI, this.provider);
            const testAddresses = [
                '0x0000000000000000000000000000000000000001',
                '0x0000000000000000000000000000000000000002'
            ];
            for (const address of testAddresses) {
                await this.evaluateBorrowerPosition(address, symbol, token);
            }
        } catch (error) {
            console.error(`❌ Error checking ${symbol} market:`, error);
        }
    }

    async evaluateBorrowerPosition(borrowerAddress, collateralSymbol, collateralToken) {
        try {
            const [error, liquidity, shortfall] = await this.comptroller.getAccountLiquidity(borrowerAddress);
            if (error.gt(0)) {
                console.log(`⚠️ Error getting account data for ${borrowerAddress}`);
                return;
            }
            if (shortfall.gt(0)) {
                console.log(`🎯 Found liquidatable ${collateralSymbol} position: ${borrowerAddress}`);
                console.log(`   Shortfall: ${ethers.utils.formatEther(shortfall)} USD`);
                await this.attemptMemeTokenLiquidation(borrowerAddress, collateralSymbol, collateralToken);
            } else {
                const healthFactor = await this.calculateHealthFactor(borrowerAddress);
                if (healthFactor.gt(0) && healthFactor.lt(config.HEALTH_FACTOR_ALERT)) {
                    console.log(`⚡ ${collateralSymbol} position approaching liquidation: ${borrowerAddress}`);
                    console.log(`   Health Factor: ${ethers.utils.formatEther(healthFactor)}`);
                    this.monitoredPositions.set(`${borrowerAddress}-${collateralSymbol}`, {
                        borrower: borrowerAddress,
                        collateralSymbol: collateralSymbol,
                        collateralToken: collateralToken,
                        lastHealthFactor: healthFactor,
                        addedAt: Date.now()
                    });
                }
            }
        } catch (error) {
            console.error(`❌ Error evaluating ${collateralSymbol} position for ${borrowerAddress}:`, error);
        }
    }

    async attemptMemeTokenLiquidation(borrowerAddress, collateralSymbol, collateralToken) {
        try {
            const bestLiquidation = await this.findOptimalLiquidation(
                borrowerAddress,
                collateralSymbol,
                collateralToken
            );
            if (!bestLiquidation) {
                console.log(`💸 No profitable liquidation found for ${collateralSymbol} position`);
                return;
            }
            const { debtSymbol, debtToken, repayAmount, estimatedProfit } = bestLiquidation;
            const [finalProfit, isViable] = await this.liquidationBot.estimateLiquidationProfit(
                borrowerAddress,
                collateralToken.vToken,
                debtToken.vToken,
                repayAmount
            );
            if (!isViable || finalProfit.lt(ethers.utils.parseEther(config.MIN_PROFIT_THRESHOLD_USD.toString()))) {
                console.log(`💸 ${collateralSymbol} liquidation not profitable enough`);
                return;
            }
            if (!this.checkDailyLimits(repayAmount)) {
                console.log(`🚫 Daily liquidation limit reached`);
                return;
            }
            console.log(`💰 Executing profitable ${collateralSymbol} liquidation:`);
            console.log(`   Borrower: ${borrowerAddress}`);
            console.log(`   Collateral: ${collateralSymbol}`);
            console.log(`   Debt: ${debtSymbol}`);
            console.log(`   Repay Amount: ${ethers.utils.formatUnits(repayAmount, debtToken.decimals)} ${debtSymbol}`);
            console.log(`   Expected Profit: $${ethers.utils.formatEther(finalProfit)}`);
            await this.executeLiquidation(
                borrowerAddress,
                collateralToken,
                debtToken,
                repayAmount
            );
        } catch (error) {
            console.error(`❌ Error attempting ${collateralSymbol} liquidation:`, error);
        }
    }

    async findOptimalLiquidation(borrowerAddress, collateralSymbol, collateralToken) {
        let bestLiquidation = null;
        let maxProfit = ethers.BigNumber.from(0);
        for (const [debtSymbol, debtToken] of Object.entries(config.STABLECOINS)) {
            try {
                const vToken = new ethers.Contract(debtToken.vToken, VTOKEN_ABI, this.provider);
                const borrowBalance = await vToken.borrowBalanceStored(borrowerAddress);
                if (borrowBalance.gt(0)) {
                    const maxRepayAmount = borrowBalance.div(2);
                    const repayAmountUSD = await this.convertToUSD(maxRepayAmount, debtToken);
                    if (repayAmountUSD.gte(ethers.utils.parseEther(collateralToken.minLiquidationUSD.toString()))) {
                        const [estimatedProfit, isViable] = await this.liquidationBot.estimateLiquidationProfit(
                            borrowerAddress,
                            collateralToken.vToken,
                            debtToken.vToken,
                            maxRepayAmount
                        );
                        if (isViable && estimatedProfit.gt(maxProfit)) {
                            maxProfit = estimatedProfit;
                            bestLiquidation = {
                                debtSymbol,
                                debtToken,
                                repayAmount: maxRepayAmount,
                                estimatedProfit
                            };
                        }
                    }
                }
            } catch (error) {
                console.log(`⚠️ Could not check ${debtSymbol} debt for ${borrowerAddress}`);
            }
        }
        return bestLiquidation;
    }

    async executeLiquidation(borrowerAddress, collateralToken, debtToken, repayAmount) {
        try {
            if (DRY_RUN) {
                console.log(`[DRY_RUN] Would liquidate ${collateralToken.symbol} -> repay ${debtToken.symbol} for borrower ${borrowerAddress}`);
                return;
            }
            const flashLoanPool = this.selectFlashLoanPool(collateralToken, debtToken);
            if (!flashLoanPool) {
                throw new Error('No suitable flash loan pool found');
            }
            const gasPrice = await this.provider.getGasPrice();
            if (gasPrice.gt(config.MAX_GAS_PRICE)) {
                console.log(`⛽ Gas price too high: ${ethers.utils.formatUnits(gasPrice, 'gwei')} gwei`);
                return;
            }
            const tx = await this.liquidationBot.liquidateMemeCollateral(
                borrowerAddress,
                collateralToken.vToken,
                debtToken.vToken,
                repayAmount,
                flashLoanPool,
                {
                    gasLimit: 1200000,
                    gasPrice: gasPrice.mul(110).div(100)
                }
            );
            console.log(`🚀 Liquidation transaction sent: ${tx.hash}`);
            const receipt = await tx.wait();
            if (receipt.status === 1) {
                console.log(`✅ ${collateralToken.symbol} liquidation successful!`);
                console.log(`   Gas used: ${receipt.gasUsed}`);
                console.log(`   Transaction: https://bscscan.com/tx/${tx.hash}`);
                this.updateLiquidationStats(collateralToken.symbol, repayAmount, receipt.gasUsed);
                this.monitoredPositions.delete(`${borrowerAddress}-${collateralToken.symbol}`);
            } else {
                console.log(`❌ ${collateralToken.symbol} liquidation failed`);
            }
        } catch (error) {
            console.error(`❌ Error executing ${collateralToken.symbol} liquidation:`, error);
            if (error.code === 'INSUFFICIENT_FUNDS') {
                console.log('💰 Insufficient BNB for gas fees');
            } else if (error.message && error.message.includes('liquidation not viable')) {
                console.log('📉 Market conditions changed, liquidation no longer viable');
            }
        }
    }

    selectFlashLoanPool(collateralToken, debtToken) {
        const collateralSymbol = collateralToken.symbol;
        const debtSymbol = debtToken.symbol;
        if (collateralSymbol === 'DOGE') {
            return config.FLASH_LOAN_POOLS['DOGE-WBNB'] || config.FLASH_LOAN_POOLS['WBNB-' + debtSymbol];
        } else if (collateralSymbol === 'SHIB') {
            return config.FLASH_LOAN_POOLS['SHIB-WBNB'] || config.FLASH_LOAN_POOLS['WBNB-' + debtSymbol];
        }
        return config.FLASH_LOAN_POOLS['WBNB-' + debtSymbol];
    }

    async monitorPriceMovements() {
        setInterval(async () => {
            for (const [symbol, token] of Object.entries(config.MEME_TOKENS)) {
                try {
                    const newPrice = await this.getStablecoinPriceBySymbol(symbol);
                    const cached = this.priceCache.get(symbol);
                    if (cached) {
                        const priceChange = newPrice.sub(cached.price).mul(10000).div(cached.price);
                        if (priceChange.lt(-500)) {
                            console.log(`🚨 ${symbol} price drop detected: ${priceChange.toNumber() / 100}%`);
                            console.log(`   Old: $${ethers.utils.formatEther(cached.price)}`);
                            console.log(`   New: $${ethers.utils.formatEther(newPrice)}`);
                            await this.checkMemeTokenMarket(symbol, token);
                        }
                        this.priceCache.set(symbol, {
                            price: newPrice,
                            timestamp: Date.now(),
                            volatility: token.volatilityMultiplier
                        });
                    } else {
                        this.priceCache.set(symbol, {
                            price: newPrice,
                            timestamp: Date.now(),
                            volatility: token.volatilityMultiplier
                        });
                    }
                } catch (error) {
                    console.error(`❌ Error monitoring ${symbol} price:`, error);
                }
            }
        }, 30000);
    }

    setupEventListeners() {
        console.log('👂 Setting up event listeners for DOGE/SHIB positions...');
        if (DRY_RUN) {
            console.log('👂 DRY_RUN: Skipping contract event listeners');
            return;
        }
        this.liquidationBot.on('MemeTokenLiquidation', (borrower, collateralToken, debtToken, amount, profit, gasUsed, event) => {
            console.log('🎉 Liquidation event received:');
            console.log(`   Borrower: ${borrower}`);
            console.log(`   Profit: $${ethers.utils.formatEther(profit)}`);
        });
    }

    async getPipAddressForSymbol(symbol) {
        const ilk = config.ILKS[symbol];
        if (!ilk) {
            throw new Error(`Unsupported symbol for price lookup: ${symbol}`);
        }
        const spotIlk = await this.spot.ilks(ilk);
        // spot.ilks returns (pip, mat). Handle tuple or object form.
        const pip = Array.isArray(spotIlk) ? spotIlk[0] : (spotIlk.pip || spotIlk[0]);
        if (!pip || pip === ethers.constants.AddressZero) {
            throw new Error(`No pip configured in Spot for ${symbol}`);
        }
        return pip;
    }

    async getStablecoinPriceBySymbol(symbol) {
        const pip = await this.getPipAddressForSymbol(symbol);
        const feed = new ethers.Contract(pip, PRICE_FEED_ABI, this.provider);
        const result = await feed.peek();
        // Handle tuple forms across ethers versions
        const priceBytes = Array.isArray(result) ? result[0] : result.price || result[0];
        const valid = Array.isArray(result) ? result[1] : result.valid ?? result[1];
        if (!valid) {
            throw new Error(`Price feed for ${symbol} returned invalid`);
        }
        return ethers.BigNumber.from(priceBytes);
    }

    async convertToUSD(amount, token) {
        // Stablecoin debts (USDT/USDC/BUSD) are treated as $1 peg.
        // Convert token amount to WAD USD using its decimals.
        const oneUSDWad = ethers.utils.parseEther('1'); // 1e18
        return amount.mul(oneUSDWad).div(ethers.utils.parseUnits('1', token.decimals));
    }

    async calculateHealthFactor(borrowerAddress) {
        try {
            return await this.liquidationBot.getCollateralHealthFactor(borrowerAddress);
        } catch (error) {
            return ethers.BigNumber.from(0);
        }
    }

    checkDailyLimits(repayAmount) {
        if (Date.now() - this.dailyStats.lastReset > 86400000) {
            this.resetDailyStats();
        }
        const currentDailyVolume = this.dailyStats.totalVolume;
        const dailyLimit = ethers.utils.parseEther(config.DAILY_LIQUIDATION_LIMIT_USD.toString());
        return currentDailyVolume.add(repayAmount).lt(dailyLimit);
    }

    updateLiquidationStats(collateralSymbol, repayAmount, gasUsed) {
        this.dailyStats.liquidationsExecuted++;
        this.dailyStats.totalVolume = this.dailyStats.totalVolume.add(repayAmount);
        console.log(`📊 Daily Stats Updated:`);
        console.log(`   Liquidations: ${this.dailyStats.liquidationsExecuted}`);
        console.log(`   Volume: $${ethers.utils.formatEther(this.dailyStats.totalVolume)}`);
    }

    resetDailyStats() {
       this.dailyStats = {
           liquidationsExecuted: 0,
           totalVolume: ethers.BigNumber.from(0),
           totalProfit: ethers.BigNumber.from(0),
           lastReset: Date.now()
       };
       console.log('📈 Daily statistics reset');
    }

    updateDailyStats() {
        if (this.dailyStats.liquidationsExecuted > 0) {
            console.log('📊 Bot Status Update:');
            console.log(`   🎯 Liquidations today: ${this.dailyStats.liquidationsExecuted}`);
            console.log(`   💰 Volume today: $${ethers.utils.formatEther(this.dailyStats.totalVolume)}`);
            console.log(`   👀 Monitoring ${this.monitoredPositions.size} positions`);
        }
    }

    cleanupOldData() {
        const cutoff = Date.now() - 86400000;
        for (const [key, position] of this.monitoredPositions) {
            if (position.addedAt < cutoff) {
                this.monitoredPositions.delete(key);
            }
        }
    }

    async evaluatePosition(positionKey, position) {
        try {
            const healthFactor = await this.calculateHealthFactor(position.borrower);
            if (healthFactor.lt(config.HEALTH_FACTOR_LIQUIDATION)) {
                console.log(`🎯 Monitored ${position.collateralSymbol} position now liquidatable: ${position.borrower}`);
                await this.attemptMemeTokenLiquidation(
                    position.borrower,
                    position.collateralSymbol,
                    position.collateralToken
                );
            }
        } catch (error) {
            console.error(`❌ Error evaluating position ${positionKey}:`, error);
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getStatus() {
        return {
            isRunning: this.isRunning,
            monitoredPositions: this.monitoredPositions.size,
            dailyStats: this.dailyStats,
            walletAddress: this.wallet.address,
            supportedTokens: Object.keys(config.MEME_TOKENS)
        };
    }
}

module.exports = DogeShiBLiquidationBot;

if (require.main === module) {
    const bot = new DogeShiBLiquidationBot();
    process.on('SIGINT', async () => {
        await bot.stop();
        process.exit(0);
    });
    process.on('SIGTERM', async () => {
        await bot.stop();
        process.exit(0);
    });
    bot.start().catch(console.error);
}