# USDog Stablecoin Deployment Guide

## Overview

USDog is a stablecoin system on Binance Smart Chain that accepts Dogecoin and Shiba Inu as collateral. This guide covers deployment to BSC mainnet and testnet.

## Prerequisites

1. **Node.js** (v16 or higher)
2. **BSC wallet** with BNB for deployment
3. **BSC API key** (optional, for contract verification)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your values:
```env
PRIVATE_KEY=your_private_key_without_0x_prefix
BSCSCAN_API_KEY=your_bscscan_api_key_here
```

### 3. Compile Contracts

```bash
npm run compile
```

## Deployment

### BSC Testnet (Recommended First)

```bash
npm run deploy:bsc-testnet
```

### BSC Mainnet

```bash
npm run deploy:bsc
```

## Contract Addresses

### Collateral Tokens (BSC Mainnet)
- **DOGE**: `0xba2ae424d960c63147c624c9a5505711facf8614`
- **SHIB**: `0x2859e4544c4bb03966803b044a93563bd2d0dd4d`

### Chainlink Price Feeds (BSC Mainnet)
- **DOGE/USD**: `0x3AB0A0d137D4F946fBB19eecc6e92E64660231C8`
- **SHIB/USD**: `0xA615Be6cb0f3F36A641858dB6F30B9242d0ABeD8`

## System Configuration

### Collateral Parameters
- **Liquidation Ratio**: 150% for both DOGE and SHIB
- **Stability Fee**: 2% APR
- **Liquidation Penalty**: 10%
- **Debt Ceiling**: 10M USDog per collateral type
- **Dust Limit**: 100 USDog minimum

### Global Parameters
- **Total Debt Ceiling**: 50M USDog
- **Emergency Shutdown Delay**: 24 hours

## Post-Deployment Steps

### 1. Verify Contracts (Optional)

If you have a BSCScan API key:

```bash
npx hardhat verify --network bsc CONTRACT_ADDRESS
```

### 2. Test Basic Functions

```javascript
// Test price feeds
const dogePrice = await dogePriceFeed.read();
console.log("DOGE Price:", dogePrice);

// Test system health
const totalDebt = await vat.debt();
console.log("Total System Debt:", totalDebt);
```

### 3. Set Up Monitoring

Monitor key metrics:
- Chainlink price feed updates
- System collateralization ratio
- Liquidation events
- Stability fee collection

## Security Considerations

### Access Control
- All admin functions are protected by `auth` modifier
- Transfer admin rights to multisig or governance contract
- Set up emergency procedures

### Risk Management
- Monitor collateralization ratios
- Set up liquidation bot infrastructure
- Monitor price feed staleness

## Troubleshooting

### Common Issues

1. **Gas Estimation Failed**
   - Increase gas limit in hardhat.config.js
   - Check contract interactions are valid

2. **Price Feed Issues**
   - Verify Chainlink feeds are active
   - Check price staleness parameters

3. **Liquidation Problems**
   - Ensure clipper has proper calc contract
   - Verify auction parameters

### Emergency Procedures

If system issues arise:

1. **Pause new debt issuance**:
   ```javascript
   await vat.file("Line", 0); // Set global debt ceiling to 0
   ```

2. **Emergency shutdown**:
   ```javascript
   await end.cage(); // Trigger global settlement
   ```

## Gas Optimization

### Deployment Costs (Estimated)
- Total deployment: ~15-20M gas
- Cost at 5 gwei: ~$15-25 USD

### Runtime Gas Costs
- CDP creation: ~300k gas
- Liquidation: ~400k gas
- Price update: ~100k gas

## Integration Guide

### Creating a CDP

```javascript
// 1. Approve collateral
await dogeToken.approve(dogeJoinAddress, collateralAmount);

// 2. Use Multicall for atomic CDP creation
const calls = await multicall.createCDPBatch(
    userAddress,
    vatAddress,
    dogeJoinAddress,
    daiJoinAddress,
    ethers.utils.formatBytes32String("DOGE-A"),
    parseEther("1000"), // DOGE amount
    parseEther("50")    // USDog amount
);

await multicall.aggregate(calls);
```

### Participating in Liquidations

```javascript
// Monitor for liquidation opportunities
const filter = dog.filters.Bark();
dog.on(filter, async (ilk, urn, ink, art, due, clip, id) => {
    // Participate in auction
    await clipper.take(
        id,                 // auction id
        parseEther("100"),  // max collateral to buy
        maxAcceptablePrice, // price limit
        buyerAddress,       // recipient
        "0x"               // callback data
    );
});
```

## Support

For technical issues:
1. Check the test suite: `npm test`
2. Review contract documentation
3. Monitor BSC transaction status on BscScan

## License

This project is licensed under AGPL-3.0-or-later.