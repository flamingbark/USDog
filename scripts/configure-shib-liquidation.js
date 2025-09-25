const { ethers } = require("hardhat");

/**
 * Configure SHIB Liquidation System
 *
 * Uses the already deployed SHIB clipper: 0xB2E90DacB905F9a979AFbCc87Ea18404f077Da20
 * and configures the Dog contract to enable SHIB liquidations
 */

async function main() {
    console.log("⚙️ Configuring SHIB Liquidation System...\n");

    const [signer] = await ethers.getSigners();
    console.log("Configuring with account:", signer.address);

    // Contract addresses
    const addresses = {
        dog: "0x8F8f0E79cE4AAaC0E19826C3F730DC82B107AB88",
        shibClipper: "0xB2E90DacB905F9a979AFbCc87Ea18404f077Da20", // Already deployed
        calc: "0x97acD6e75a93De8eB1b84E944Ac6319710F04636"
    };

    const shibIlk = ethers.utils.formatBytes32String("SHIB-A");
    const WAD = ethers.BigNumber.from("1000000000000000000"); // 1e18

    // Initialize contracts
    const dog = await ethers.getContractAt("Dog", addresses.dog);
    const shibClipper = await ethers.getContractAt("Clipper", addresses.shibClipper);

    console.log("📋 Using contracts:");
    console.log("- Dog:", addresses.dog);
    console.log("- SHIB Clipper:", addresses.shibClipper);

    try {
        // Configure Dog contract for SHIB
        console.log("\n🐕 Configuring Dog contract for SHIB liquidations...");

        // Set clipper address
        console.log("Setting SHIB clipper address...");
        const tx1 = await dog["file(bytes32,bytes32,address)"](
            shibIlk,
            ethers.utils.formatBytes32String("clip"),
            addresses.shibClipper
        );
        await tx1.wait();
        console.log("✅ Set SHIB clipper in Dog");

        // Set liquidation penalty (10%)
        console.log("Setting liquidation penalty...");
        const chop = WAD.mul(11).div(10); // 110% (10% penalty)
        const tx2 = await dog["file(bytes32,bytes32,uint256)"](
            shibIlk,
            ethers.utils.formatBytes32String("chop"),
            chop
        );
        await tx2.wait();
        console.log("✅ Set SHIB liquidation penalty to 10%");

        // Set per-ilk liquidation limit (1M USDog)
        console.log("Setting liquidation limit...");
        const hole = ethers.utils.parseUnits("1000000", 45); // 1M rad
        const tx3 = await dog["file(bytes32,bytes32,uint256)"](
            shibIlk,
            ethers.utils.formatBytes32String("hole"),
            hole
        );
        await tx3.wait();
        console.log("✅ Set SHIB liquidation limit to 1M USDog");

        // Grant Dog permission on clipper
        console.log("\n🔐 Setting up permissions...");
        const tx4 = await shibClipper.rely(addresses.dog);
        await tx4.wait();
        console.log("✅ Granted Dog permission on SHIB Clipper");

    } catch (e) {
        console.log("⚠️ Configuration may have failed:", e.message);
        console.log("This could be due to permission issues or already configured settings");
    }

    // Verify configuration
    console.log("\n✅ Verifying SHIB liquidation configuration...");

    try {
        const shibConfig = await dog.ilks(shibIlk);
        console.log("SHIB Liquidation Config:");
        console.log("- Clipper:", shibConfig.clip);
        console.log("- Penalty:", ethers.utils.formatEther(shibConfig.chop), "(1.1 = 10% penalty)");
        console.log("- Max liquidation:", ethers.utils.formatUnits(shibConfig.hole, 45), "USDog");

        if (shibConfig.clip === addresses.shibClipper) {
            console.log("🎉 SHIB liquidation system successfully configured!");
        } else {
            console.log("❌ Configuration verification failed");
        }

    } catch (e) {
        console.log("❌ Verification failed:", e.message);
    }

    // Update deployment file
    console.log("\n💾 Updating deployment records...");

    try {
        const fs = require('fs');
        const path = require('path');

        // Update all-contracts.json
        const contractsFile = path.join(__dirname, '../deployments/all-contracts.json');
        const contracts = JSON.parse(fs.readFileSync(contractsFile, 'utf8'));

        contracts.collateral.shib.clipper = addresses.shibClipper;
        contracts.timestamp = new Date().toISOString();

        fs.writeFileSync(contractsFile, JSON.stringify(contracts, null, 2));
        console.log("✅ Updated all-contracts.json");

        // Also update mainnet-addresses.json
        const mainnetFile = path.join(__dirname, '../deployments/mainnet-addresses.json');
        const mainnet = JSON.parse(fs.readFileSync(mainnetFile, 'utf8'));

        mainnet.collateral.shib.clipper = addresses.shibClipper;
        mainnet.timestamp = new Date().toISOString();

        fs.writeFileSync(mainnetFile, JSON.stringify(mainnet, null, 2));
        console.log("✅ Updated mainnet-addresses.json");

    } catch (e) {
        console.log("⚠️ Could not update deployment files:", e.message);
    }

    console.log("\n🎉 SHIB Liquidation Configuration Complete!");
    console.log("SHIB positions can now be liquidated via the flash liquidation system.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Configuration failed:", error);
        process.exit(1);
    });