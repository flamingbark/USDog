# USDog Production Deployment Instructions

## 🚨 PRODUCTION READY - BSC MAINNET DEPLOYMENT

### Pre-Deployment Checklist
- [x] Private key with deployment funds configured
- [x] DAO Safe address configured for admin rights transfer
- [x] BSCScan API key configured for contract verification
- [x] All contracts tested and audited
- [x] Real BSC token addresses configured
- [x] Chainlink price feeds configured

### Deployment Configuration

```bash
# Deployment Account
Private Key: 916916ceaffb3c0028d1f14631740c5a1ddf8380c52aef8121b20cd3d0141b17

# DAO Safe (will receive admin rights)
Safe Address: 0x754dc60D811eebfAD39Db915eE0fD3905Ea4D978

# BSCScan API Key
API Key: 3FBKFF8AXVXFCG3QHD5K2S6J7UYTKIEM5C
```

### BSC Token Addresses (Production)
- **DOGE**: `0xba2ae424d960c63147c624c9a5505711facf8614`
- **SHIB**: `0x2859e4544c4bb03966803b044a93563bd2d0dd4d`

### Chainlink Price Feeds (BSC Mainnet)
- **DOGE/USD**: `0x3AB0A0d137D4F946fBB19eecc6e92E64660231C8`
- **SHIB/USD**: `0xA615Be6cb0f3F36A641858dB6F30B9242d0ABeD8`

## Deployment Steps

### 1. Final Pre-Deployment Check
```bash
npm install
npm run compile
npm test
```

### 2. Deploy to BSC Mainnet
```bash
npm run deploy:bsc
```

### 3. Verify Contracts (Automatic)
The deployment script will automatically verify contracts using the BSCScan API key.

### 4. Admin Rights Transfer
The deployment script will automatically:
- Grant admin rights to DAO Safe: `0x754dc60D811eebfAD39Db915eE0fD3905Ea4D978`
- Revoke deployer admin rights for security

## Expected Gas Costs
- **Total Deployment**: ~15-20M gas
- **Estimated Cost**: ~$20-30 USD at 5 gwei

## Post-Deployment Verification

### 1. Verify System Health
```javascript
// Check total debt ceiling
const totalDebtCeiling = await vat.Line();
console.log("Total Debt Ceiling:", totalDebtCeiling);

// Check collateral configurations
const dogeIlk = await vat.ilks(formatBytes32String("DOGE-A"));
console.log("DOGE Configuration:", dogeIlk);
```

### 2. Verify Price Feeds
```javascript
const [dogePrice, valid] = await dogePriceFeed.peek();
console.log("DOGE Price:", dogePrice, "Valid:", valid);
```

### 3. Verify Admin Rights
```javascript
// Should be 1 for DAO Safe
const daoRights = await vat.wards("0x754dc60D811eebfAD39Db915eE0fD3905Ea4D978");
console.log("DAO Admin Rights:", daoRights);

// Should be 0 for deployer (after rights transfer)
const deployerRights = await vat.wards(deployerAddress);
console.log("Deployer Rights:", deployerRights);
```

## System Parameters (Production)

| Parameter | Value | Description |
|-----------|-------|-------------|
| **Liquidation Ratio** | 150% | Minimum collateralization |
| **Stability Fee** | 2% APR | Interest on borrowed USDog |
| **Liquidation Penalty** | 10% | Fee on liquidated positions |
| **DOGE Debt Ceiling** | 10M USDog | Maximum debt for DOGE |
| **SHIB Debt Ceiling** | 10M USDog | Maximum debt for SHIB |
| **Total Debt Ceiling** | 50M USDog | System-wide limit |
| **Dust Limit** | 100 USDog | Minimum position size |

## Security Notes

1. **Admin Rights**: Automatically transferred to DAO Safe
2. **Emergency Procedures**: End.sol provides global settlement
3. **Price Feeds**: Real-time Chainlink data
4. **Liquidations**: Automated Dutch auction system

## Monitoring Setup

After deployment, monitor:
- Chainlink price feed updates
- System collateralization ratios
- Liquidation events
- Stability fee accumulation

## Contract Verification

All contracts will be automatically verified on BSCScan using API key: `3FBKFF8AXVXFCG3QHD5K2S6J7UYTKIEM5C`

## Support Contacts

- **Technical Issues**: Check deployment logs
- **System Monitoring**: Use provided query examples
- **Emergency**: Use End.cage() through DAO Safe

---

**⚠️ IMPORTANT**: This is a production deployment with real funds. All admin rights are transferred to the DAO Safe for security.