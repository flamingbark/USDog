const { ethers } = require("hardhat");

/**
 * Deploy SHIB Clipper and Configure Liquidation System
 *
 * This script:
 * 1. Deploys a Clipper contract for SHIB-A
 * 2. Configures the Dog contract to use the new clipper
 * 3. Sets up proper liquidation parameters
 */

async function main() {
    console.log("🚀 Deploying SHIB Clipper and configuring liquidation system...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    // Load existing contract addresses
    const fs = require('fs');
    const path = require('path');
    const deploymentFile = path.join(__dirname, '../deployments/mainnet-addresses.json');
    const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));

    const addresses = {
        vat: deployment.core.vat,
        spot: deployment.core.spot,
        dog: deployment.core.dog,
        calc: deployment.liquidation.calc,
        shibPriceFeed: deployment.collateral.shib.priceFeed
    };

    console.log("Using existing contracts:");
    console.log("- Vat:", addresses.vat);
    console.log("- Spot:", addresses.spot);
    console.log("- Dog:", addresses.dog);
    console.log("- Calc:", addresses.calc);

    // Deploy SHIB Clipper
    console.log("\n📎 Deploying SHIB Clipper...");

    const Clipper = await ethers.getContractFactory("Clipper");
    const shibIlk = ethers.utils.formatBytes32String("SHIB-A");

    const shibClipper = await Clipper.deploy(
        addresses.vat,
        addresses.spot,
        addresses.dog,
        shibIlk
    );

    await shibClipper.deployed();
    const shibClipperAddress = shibClipper.address;
    console.log("✅ SHIB Clipper deployed to:", shibClipperAddress);

    // Configure the clipper
    console.log("\n⚙️ Configuring SHIB Clipper...");

    // Set calculation contract
    await shibClipper["file(bytes32,address)"](ethers.utils.formatBytes32String("calc"), addresses.calc);
    console.log("✅ Set calc contract");

    // Set clipper parameters
    const RAY = ethers.BigNumber.from("1000000000000000000000000000"); // 1e27
    const WAD = ethers.BigNumber.from("1000000000000000000"); // 1e18

    // buf: starting price multiplier (110% of current price)
    await shibClipper["file(bytes32,uint256)"](ethers.utils.formatBytes32String("buf"), RAY.mul(11).div(10));
    console.log("✅ Set buf to 110%");

    // tail: auction duration (6 hours)
    await shibClipper["file(bytes32,uint256)"](ethers.utils.formatBytes32String("tail"), 21600);
    console.log("✅ Set tail to 6 hours");

    // cusp: price drop threshold for reset (40%)
    await shibClipper["file(bytes32,uint256)"](ethers.utils.formatBytes32String("cusp"), RAY.mul(4).div(10));
    console.log("✅ Set cusp to 40%");

    // chip: incentive percentage (1%)
    await shibClipper["file(bytes32,uint256)"](ethers.utils.formatBytes32String("chip"), WAD.div(100));
    console.log("✅ Set chip to 1%");

    // tip: flat incentive (50 USDog)
    const tip = WAD.mul(50); // 50 USDog
    await shibClipper["file(bytes32,uint256)"](ethers.utils.formatBytes32String("tip"), tip);
    console.log("✅ Set tip to 50 USDog");

    // Configure Dog contract
    console.log("\n🐕 Configuring Dog contract for SHIB...");

    const dog = await ethers.getContractAt("Dog", addresses.dog);

    // Set clipper address
    await dog["file(bytes32,bytes32,address)"](shibIlk, ethers.utils.formatBytes32String("clip"), shibClipperAddress);
    console.log("✅ Set SHIB clipper in Dog");

    // Set liquidation penalty (10%)
    const chop = WAD.mul(11).div(10); // 110% (10% penalty)
    await dog["file(bytes32,bytes32,uint256)"](shibIlk, ethers.utils.formatBytes32String("chop"), chop);
    console.log("✅ Set SHIB liquidation penalty to 10%");

    // Set per-ilk liquidation limit (1M USDog)
    const hole = ethers.utils.parseUnits("1000000", 45); // 1M rad
    await dog["file(bytes32,bytes32,uint256)"](shibIlk, ethers.utils.formatBytes32String("hole"), hole);
    console.log("✅ Set SHIB liquidation limit to 1M USDog");

    // Grant necessary permissions
    console.log("\n🔐 Setting up permissions...");

    // Dog needs to be able to call clipper
    await shibClipper.rely(addresses.dog);
    console.log("✅ Granted Dog permission on SHIB Clipper");

    // Update deployment info
    console.log("\n💾 Updating deployment records...");

    deployment.collateral.shib.clipper = shibClipperAddress;
    deployment.timestamp = new Date().toISOString();

    fs.writeFileSync(deploymentFile, JSON.stringify(deployment, null, 2));
    console.log("✅ Updated mainnet-addresses.json");

    // Save specific clipper info
    const clipperInfo = {
        timestamp: new Date().toISOString(),
        network: "bsc-mainnet",
        shibClipper: shibClipperAddress,
        deployer: deployer.address,
        ilk: "SHIB-A",
        parameters: {
            buf: "110%",
            tail: "6 hours",
            cusp: "40%",
            chip: "1%",
            tip: "50 USDog",
            chop: "10%",
            hole: "1M USDog"
        }
    };

    const clipperFile = path.join(__dirname, '../deployments/shib-clipper.json');
    fs.writeFileSync(clipperFile, JSON.stringify(clipperInfo, null, 2));
    console.log("✅ Saved SHIB clipper info");

    console.log("\n🎉 SHIB Liquidation System Configured!");
    console.log("=====================================");
    console.log("SHIB Clipper:", shibClipperAddress);
    console.log("Liquidation penalty: 10%");
    console.log("Max liquidation: 1M USDog");
    console.log("Auction duration: 6 hours");
    console.log("\nSHIB positions can now be liquidated via flash loans!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });