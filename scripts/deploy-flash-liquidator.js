const { ethers } = require("hardhat");

/**
 * Deploy Flash Liquidator Contract
 *
 * This script deploys the FlashLiquidator contract and configures it
 * with the existing DOGE and SHIB collateral types.
 *
 * Usage:
 *   npx hardhat run scripts/deploy-flash-liquidator.js --network bsc
 */

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Deploying FlashLiquidator with account:", signer.address);

  // Load deployment addresses
  const fs = require('fs');
  const path = require('path');
  const deploymentFile = path.join(__dirname, '../deployments/mainnet-addresses.json');
  const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));

  // Existing contract addresses from the stablecoin system
  const addresses = {
    vat: deployment.core.vat,
    daiJoin: deployment.core.daiJoin,
    stablecoin: deployment.core.stablecoin,
    dogeJoin: deployment.collateral.doge.join,
    shibJoin: deployment.collateral.shib.join,
  };

  // BSC token addresses
  const tokens = {
    DOGE: deployment.collateral.doge.token,
    SHIB: deployment.collateral.shib.token,
    WBNB: deployment.external.wbnb,
  };

  console.log("Deploying FlashLiquidator...");

  // Deploy FlashLiquidator
  const FlashLiquidator = await ethers.getContractFactory("FlashLiquidator");
  const flashLiquidator = await FlashLiquidator.deploy(
    addresses.vat,
    addresses.daiJoin
  );

  await flashLiquidator.deployed();
  const flashLiquidatorAddress = flashLiquidator.address;

  console.log("FlashLiquidator deployed to:", flashLiquidatorAddress);

  // Configure supported collateral types
  console.log("Configuring supported collateral...");

  // Add DOGE collateral
  try {
    const tx1 = await flashLiquidator.addCollateral(tokens.DOGE, addresses.dogeJoin);
    await tx1.wait();
    console.log("✅ Added DOGE collateral support");
  } catch (e) {
    console.log("⚠️ Failed to add DOGE collateral:", e.message);
  }

  // Add SHIB collateral
  try {
    const tx2 = await flashLiquidator.addCollateral(tokens.SHIB, addresses.shibJoin);
    await tx2.wait();
    console.log("✅ Added SHIB collateral support");
  } catch (e) {
    console.log("⚠️ Failed to add SHIB collateral:", e.message);
  }

  // Output contract information for bot configuration
  console.log("\n=== Deployment Complete ===");
  console.log("FlashLiquidator Address:", flashLiquidatorAddress);
  console.log("\nUpdate your .env file with:");
  console.log(`DOGE_SHIB_BOT_CONTRACT=${flashLiquidatorAddress}`);

  console.log("\nContract is ready for flash liquidation operations!");
  console.log("The doge-shib-bot.js can now use this contract for automated liquidations.");

  // Save deployment info to a JSON file
  const deploymentInfo = {
    timestamp: new Date().toISOString(),
    network: "bsc",
    flashLiquidator: flashLiquidatorAddress,
    deployer: signer.address,
    vat: addresses.vat,
    daiJoin: addresses.daiJoin,
    stablecoin: addresses.stablecoin,
    supportedTokens: {
      DOGE: tokens.DOGE,
      SHIB: tokens.SHIB
    }
  };

  // Ensure deployment directory exists
  const deploymentDir = path.join(__dirname, '../deployments');
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }

  // Write deployment info
  const flashLiquidatorFile = path.join(deploymentDir, 'flash-liquidator.json');
  fs.writeFileSync(flashLiquidatorFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\nDeployment info saved to: ${flashLiquidatorFile}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });