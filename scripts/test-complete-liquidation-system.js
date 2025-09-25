const { ethers } = require("hardhat");

/**
 * Complete Liquidation System Test
 *
 * This script tests the entire liquidation pipeline:
 * 1. Checks existing vault positions
 * 2. Tests flash liquidator integration
 * 3. Verifies all components work together
 * 4. Tests both DOGE and SHIB scenarios
 */

async function main() {
    console.log("🧪 Testing Complete Liquidation System\n");

    const [signer] = await ethers.getSigners();
    console.log("Testing with account:", signer.address);

    // Load all contract addresses
    const fs = require('fs');
    const path = require('path');
    const contractsFile = path.join(__dirname, '../deployments/all-contracts.json');
    const contracts = JSON.parse(fs.readFileSync(contractsFile, 'utf8'));

    console.log("📋 Contract Addresses:");
    console.log("- Flash Liquidator:", contracts.liquidation.flashLiquidator);
    console.log("- Dog (Liquidation Trigger):", contracts.core.dog);
    console.log("- DOGE Clipper:", contracts.collateral.doge.clipper);
    console.log("- SHIB Clipper:", contracts.collateral.shib.clipper);

    // Initialize contracts
    const vat = await ethers.getContractAt("Vat", contracts.core.vat);
    const dog = await ethers.getContractAt("Dog", contracts.core.dog);
    const spot = await ethers.getContractAt("Spot", contracts.core.spot);
    const flashLiquidator = await ethers.getContractAt("FlashLiquidator", contracts.liquidation.flashLiquidator);

    console.log("\n🔍 System Status Check:");

    // Check if flash liquidator has proper permissions and configuration
    const dogeSupported = await flashLiquidator.supportedCollateral(contracts.collateral.doge.token);
    const shibSupported = await flashLiquidator.supportedCollateral(contracts.collateral.shib.token);

    console.log("- DOGE supported in flash liquidator:", dogeSupported);
    console.log("- SHIB supported in flash liquidator:", shibSupported);

    // Check Dog configuration
    const dogeIlk = ethers.utils.formatBytes32String("DOGE-A");
    const shibIlk = ethers.utils.formatBytes32String("SHIB-A");

    const dogeConfig = await dog.ilks(dogeIlk);
    const shibConfig = await dog.ilks(shibIlk);

    console.log("\n📊 Liquidation Configuration:");
    console.log("DOGE-A:");
    console.log("  - Clipper:", dogeConfig.clip);
    console.log("  - Penalty:", ethers.utils.formatEther(dogeConfig.chop), "% (1.0 = no penalty)");
    console.log("  - Max liquidation:", ethers.utils.formatUnits(dogeConfig.hole, 45), "USDog");

    console.log("SHIB-A:");
    console.log("  - Clipper:", shibConfig.clip);
    console.log("  - Penalty:", ethers.utils.formatEther(shibConfig.chop), "% (1.0 = no penalty)");
    console.log("  - Max liquidation:", ethers.utils.formatUnits(shibConfig.hole, 45), "USDog");

    // Test flash liquidator functionality
    console.log("\n🧪 Testing Flash Liquidator Functions:");

    try {
        // Test estimation function (should work even without real positions)
        const [estimatedProfit, isViable] = await flashLiquidator.estimateLiquidationProfit(
            signer.address,
            "0x0000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000",
            ethers.utils.parseUnits("1000", 45) // 1000 USDog debt
        );

        console.log("- Profit estimation test:");
        console.log("  - Estimated profit:", ethers.utils.formatEther(estimatedProfit), "USDog");
        console.log("  - Is viable:", isViable);

        // Test health factor calculation
        const healthFactor = await flashLiquidator.getCollateralHealthFactor(signer.address);
        console.log("- Health factor test:", ethers.utils.formatEther(healthFactor));

    } catch (e) {
        console.log("⚠️ Flash liquidator function test failed:", e.message);
    }

    // Check for actual positions to liquidate
    console.log("\n🔍 Searching for Liquidatable Positions:");

    // Check a few test addresses for positions
    const testAddresses = [
        signer.address,
        "0x754dc60D811eebfAD39Db915eE0fD3905Ea4D978", // DAO Safe
        "0x0000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000002"
    ];

    for (const testAddr of testAddresses) {
        try {
            // Check DOGE position
            const dogeUrn = await vat.urns(dogeIlk, testAddr);
            const dogeInk = dogeUrn[0];
            const dogeArt = dogeUrn[1];

            if (dogeArt.gt(0)) {
                console.log(`📍 Found DOGE position at ${testAddr}:`);
                console.log(`   Ink: ${ethers.utils.formatEther(dogeInk)} DOGE`);
                console.log(`   Art: ${ethers.utils.formatEther(dogeArt)} USDog debt`);

                // Check if unsafe
                const ilkData = await vat.ilks(dogeIlk);
                const rate = ilkData[1];
                const spotVal = ilkData[2];
                const isUnsafe = dogeInk.mul(spotVal).lt(dogeArt.mul(rate));
                console.log(`   Unsafe: ${isUnsafe}`);
            }

            // Check SHIB position
            const shibUrn = await vat.urns(shibIlk, testAddr);
            const shibInk = shibUrn[0];
            const shibArt = shibUrn[1];

            if (shibArt.gt(0)) {
                console.log(`📍 Found SHIB position at ${testAddr}:`);
                console.log(`   Ink: ${ethers.utils.formatEther(shibInk)} SHIB`);
                console.log(`   Art: ${ethers.utils.formatEther(shibArt)} USDog debt`);

                // Check if unsafe
                const ilkData = await vat.ilks(shibIlk);
                const rate = ilkData[1];
                const spotVal = ilkData[2];
                const isUnsafe = shibInk.mul(spotVal).lt(shibArt.mul(rate));
                console.log(`   Unsafe: ${isUnsafe}`);
            }

        } catch (e) {
            // Ignore errors for test addresses
        }
    }

    // Test price feed connectivity
    console.log("\n📊 Testing Price Feed Connectivity:");

    try {
        const dogeSpotData = await spot.ilks(dogeIlk);
        const dogePip = dogeSpotData[0];
        const dogeMat = dogeSpotData[1];

        console.log("DOGE Price Feed:");
        console.log("  - Price feed address:", dogePip);
        console.log("  - Liquidation ratio:", ethers.utils.formatUnits(dogeMat, 27));

        if (dogePip !== "0x0000000000000000000000000000000000000000") {
            const dogeFeed = await ethers.getContractAt("PriceFeed", dogePip);
            try {
                const dogePrice = await dogeFeed.peek();
                console.log("  - Current price:", ethers.utils.formatUnits(dogePrice[0], 18));
                console.log("  - Price valid:", dogePrice[1]);
            } catch (e) {
                console.log("  - Price read failed:", e.message);
            }
        }

        const shibSpotData = await spot.ilks(shibIlk);
        const shibPip = shibSpotData[0];
        const shibMat = shibSpotData[1];

        console.log("SHIB Price Feed:");
        console.log("  - Price feed address:", shibPip);
        console.log("  - Liquidation ratio:", ethers.utils.formatUnits(shibMat, 27));

        if (shibPip !== "0x0000000000000000000000000000000000000000") {
            const shibFeed = await ethers.getContractAt("PriceFeed", shibPip);
            try {
                const shibPrice = await shibFeed.peek();
                console.log("  - Current price:", ethers.utils.formatUnits(shibPrice[0], 18));
                console.log("  - Price valid:", shibPrice[1]);
            } catch (e) {
                console.log("  - Price read failed:", e.message);
            }
        }

    } catch (e) {
        console.log("⚠️ Price feed test failed:", e.message);
    }

    // System health summary
    console.log("\n📋 System Health Summary:");
    console.log("=========================");

    const issues = [];
    const working = [];

    // Check core components
    if (contracts.liquidation.flashLiquidator !== "0x0000000000000000000000000000000000000000") {
        working.push("✅ Flash Liquidator deployed");
    } else {
        issues.push("❌ Flash Liquidator missing");
    }

    if (contracts.collateral.doge.clipper !== "0x0000000000000000000000000000000000000000") {
        working.push("✅ DOGE liquidation configured");
    } else {
        issues.push("❌ DOGE liquidation not configured");
    }

    if (contracts.collateral.shib.clipper !== "0x0000000000000000000000000000000000000000") {
        working.push("✅ SHIB liquidation configured");
    } else {
        issues.push("⚠️ SHIB liquidation not configured (clipper missing)");
    }

    if (dogeSupported && shibSupported) {
        working.push("✅ Flash liquidator supports both tokens");
    } else {
        issues.push("❌ Flash liquidator missing token support");
    }

    console.log("Working Components:");
    working.forEach(item => console.log(item));

    if (issues.length > 0) {
        console.log("\nIssues Found:");
        issues.forEach(item => console.log(item));
    }

    // Recommendations
    console.log("\n💡 Recommendations:");
    if (contracts.collateral.shib.clipper === "0x0000000000000000000000000000000000000000") {
        console.log("1. Deploy SHIB Clipper contract");
        console.log("2. Configure Dog contract to use SHIB Clipper");
        console.log("3. Set appropriate liquidation parameters for SHIB");
    }

    console.log("4. Test liquidation with small amounts");
    console.log("5. Monitor for liquidation opportunities");
    console.log("6. Ensure sufficient BNB for gas fees");

    console.log("\n🎉 Complete Liquidation System Test Finished!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Test failed:", error);
        process.exit(1);
    });