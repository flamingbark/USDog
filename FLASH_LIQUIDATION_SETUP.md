# Flash Liquidation System Setup Guide

This guide explains how to set up and use the flash liquidation system for the DOGE/SHIB stablecoin project.

## Overview

The flash liquidation system consists of:

1. **FlashLiquidator.sol** - Smart contract that performs flash liquidations using PancakeSwap flash loans
2. **doge-shib-bot.js** - Automated bot that monitors positions and triggers liquidations
3. **Deploy and test scripts** - Tools for deployment and testing

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  DOGE/SHIB Bot  │────│ FlashLiquidator  │────│  PancakeSwap    │
│  (Monitor)      │    │  (Execute)       │    │  (Flash Loans)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Dog.sol       │    │   Clip.sol       │    │  Vat.sol        │
│  (Liquidation   │    │  (Auction)       │    │  (Core CDP)     │
│   Trigger)      │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Features

- **Zero-capital liquidations** using PancakeSwap flash loans
- **Automated monitoring** of DOGE and SHIB positions
- **Profit optimization** with configurable thresholds
- **Risk management** with daily limits and safety checks
- **Multi-token support** for various collateral types

## Prerequisites

1. **Node.js** v16+ and npm
2. **Hardhat** development environment
3. **BSC testnet/mainnet** access
4. **Private key** with BNB for gas fees
5. **BSC RPC endpoint** (Binance, Ankr, or similar)

## Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

Required environment variables:
```env
# Network
BSC_RPC_URL=https://bsc-dataseed.binance.org/
BSC_WSS_URL=wss://bsc-ws-node.nariox.org:443
PRIVATE_KEY=your_private_key_here

# Contracts (will be populated after deployment)
DOGE_SHIB_BOT_CONTRACT=
SPOT_ADDRESS=0x5f029d9b48162a809919e595c2b712f5cb039d19

# Bot Configuration
DRY_RUN=true
MIN_PROFIT_THRESHOLD_USD=50
MAX_SINGLE_LIQUIDATION_USD=10000
DAILY_LIQUIDATION_LIMIT_USD=100000
```

## Deployment

### 1. Deploy FlashLiquidator Contract

```bash
npx hardhat run scripts/deploy-flash-liquidator.js --network bsc
```

This will:
- Deploy the FlashLiquidator contract
- Configure DOGE and SHIB collateral support
- Output the contract address for the bot

### 2. Update Environment

After deployment, update your `.env` file:
```env
DOGE_SHIB_BOT_CONTRACT=0x... # Address from deployment output
```

### 3. Verify Deployment

```bash
npx hardhat verify --network bsc 0x... VAT_ADDRESS DAIJOIN_ADDRESS
```

## Testing

### 1. Test Flash Liquidation Contract

```bash
# Test with SHIB collateral
COLLATERAL=SHIB AMOUNT=1000 FLASH_LIQUIDATOR=0x... npx hardhat run scripts/test-flash-liquidation.js --network bsc

# Test with DOGE collateral
COLLATERAL=DOGE AMOUNT=500 FLASH_LIQUIDATOR=0x... npx hardhat run scripts/test-flash-liquidation.js --network bsc

# Force unsafe position for testing
COLLATERAL=SHIB FORCE=1 FLASH_LIQUIDATOR=0x... npx hardhat run scripts/test-flash-liquidation.js --network bsc
```

### 2. Test Traditional Liquidation

```bash
# Test existing liquidation mechanism
ILK=SHIB-A USER=0x... KPR=0x... npx hardhat run scripts/test-liquidations.js --network bsc
```

## Running the Bot

### 1. Dry Run Mode (Safe Testing)

```bash
DRY_RUN=true node scripts/doge-shib-bot.js
```

This mode will:
- Monitor positions without executing transactions
- Log liquidation opportunities
- Estimate profits
- Test all systems safely

### 2. Live Mode (Real Liquidations)

```bash
DRY_RUN=false node scripts/doge-shib-bot.js
```

⚠️ **Warning:** Live mode will execute real transactions and spend gas fees.

### 3. Monitor Specific Tokens

```bash
# Monitor only DOGE positions
TOKENS=DOGE DRY_RUN=true node scripts/doge-shib-bot.js

# Monitor only SHIB positions
TOKENS=SHIB DRY_RUN=true node scripts/doge-shib-bot.js
```

## Bot Configuration

### Risk Management

The bot includes several safety mechanisms:

```javascript
// Position thresholds
HEALTH_FACTOR_ALERT: 1.1,        // Monitor positions below 110%
HEALTH_FACTOR_LIQUIDATION: 1.0,  // Liquidate positions below 100%

// Profit thresholds
MIN_PROFIT_THRESHOLD_USD: 50,     // Minimum $50 profit
TARGET_PROFIT_MARGIN: 0.15,      // Target 15% profit margin

// Volume limits
MAX_SINGLE_LIQUIDATION_USD: 10000,   // Max $10k per liquidation
DAILY_LIQUIDATION_LIMIT_USD: 100000, // Max $100k per day

// Gas management
MAX_GAS_PRICE: 25 gwei,           // Maximum gas price
SLIPPAGE_TOLERANCE: 5%,           // Maximum slippage
```

### Monitoring Intervals

```javascript
MONITORING_INTERVAL: 3000,        // Check every 3 seconds
PRICE_UPDATE_INTERVAL: 30000,     // Update prices every 30 seconds
```

## Flash Loan Pools

The system uses PancakeSwap V2 pairs for flash loans:

```javascript
FLASH_LOAN_POOLS: {
  'DOGE-WBNB': '0x...',  // DOGE/WBNB pair
  'SHIB-WBNB': '0x...',  // SHIB/WBNB pair
  'WBNB-USDT': '0x36696169C63e42cd08ce11f5deeBbCeBae652050', // Fallback
  'WBNB-BUSD': '0x7EFaEf62fDdCCa950418312c6C91Aef321375A00'  // Fallback
}
```

## Monitoring & Logs

### Bot Status

The bot provides detailed logging:

```
🐕 DOGE/SHIB Flash Liquidation Bot initialized
📍 Wallet address: 0x...
🎯 Monitoring meme token collateral liquidations

🔍 Scanning for DOGE/SHIB liquidation opportunities...
💰 SHIB price: $0.000008234
⚡ DOGE position approaching liquidation: 0x...
   Health Factor: 1.05

🎯 Found liquidatable SHIB position: 0x...
   Shortfall: 234.56 USD
💰 Executing profitable SHIB liquidation:
   Expected Profit: $127.34
🚀 Liquidation transaction sent: 0x...
✅ SHIB liquidation successful!
```

### Performance Metrics

```
📊 Daily Stats Updated:
   Liquidations: 15
   Volume: $45,234.56
   Profit: $3,456.78
   Success Rate: 93.3%
```

## Troubleshooting

### Common Issues

1. **"'claude' is not recognized" Error**
   - This error is unrelated to the stablecoin system
   - Refers to Claude Code CLI installation issues

2. **"not-unsafe" Error**
   - Position is not eligible for liquidation
   - Wait for price movement or use FORCE=1 in tests

3. **"insufficient-repayment" Error**
   - Not enough tokens to repay flash loan
   - Check profit calculations and slippage

4. **"invalid-pair" Error**
   - Flash loan pool address is incorrect
   - Verify PancakeSwap pair addresses

5. **High Gas Fees**
   - Adjust MAX_GAS_PRICE in configuration
   - Monitor BSC network congestion

### Debug Mode

Enable detailed debugging:

```bash
DEBUG=1 DRY_RUN=true node scripts/doge-shib-bot.js
```

This provides:
- Detailed transaction traces
- Price feed information
- Health factor calculations
- Profit estimation details

## Security Considerations

1. **Private Key Security**
   - Never commit private keys to git
   - Use hardware wallets for mainnet
   - Rotate keys regularly

2. **Flash Loan Risks**
   - Monitor for MEV attacks
   - Implement slippage protection
   - Set reasonable profit thresholds

3. **Smart Contract Risks**
   - Audit contracts before mainnet deployment
   - Test thoroughly on testnet
   - Monitor for unusual behavior

## Support

For issues and questions:

1. Check the troubleshooting section above
2. Review transaction logs and error messages
3. Test on BSC testnet first
4. Ensure all prerequisites are met

## Contract Addresses

### BSC Mainnet

```
Vat:         0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be
Spot:        0x5f029d9b48162a809919e595c2b712f5cb039d19
Dog:         0x8F8f0E79cE4AAaC0E19826C3F730DC82B107AB88
DaiJoin:     0xEae2f180ad117A407A595D31782e66D0dA727967
Stablecoin:  0xb1abd2a64b829596d7afefca31a6c984b5afaafb

DOGE Token:  0xbA2aE424d960c26247Dd6c32edC70B295c744C43
SHIB Token:  0x2859e4544C4bB03966803b044A93563Bd2D0DD4D
```

### PancakeSwap

```
Router:      0x10ED43C718714eb63d5aA57B78B54704E256024E
Factory:     0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73
WBNB:        0xbb4CdB9CBd36B01bD1cBaeBF2De08d9173bc095c
```

## License

AGPL-3.0-or-later