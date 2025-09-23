const { ethers } = require("hardhat");

async function main() {
    console.log("🔄 Redeploying DogeJoin with Correct Token Address...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    // Contract addresses
    const addresses = {
        vat: "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be"
    };

    // Correct DOGE token address
    const CORRECT_DOGE_TOKEN = "0xba2ae424d960c26247dd6c32edc70b295c744c43";

    console.log("🔧 Deploying new DogeJoin contract...");

    // Deploy new DogeJoin with correct token address
    const DogeJoin = await ethers.getContractFactory("DogeJoin");
    const newDogeJoin = await DogeJoin.deploy(addresses.vat, CORRECT_DOGE_TOKEN);
    await newDogeJoin.waitForDeployment();
    const newDogeJoinAddress = await newDogeJoin.getAddress();

    console.log("✅ New DogeJoin deployed to:", newDogeJoinAddress);

    // Grant permissions to the new DogeJoin
    console.log("🔑 Granting permissions to new DogeJoin...");
    const vat = await ethers.getContractAt("Vat", addresses.vat);
    await vat.rely(newDogeJoinAddress);
    console.log("✅ Granted Vat permissions to new DogeJoin");

    // Update frontend config
    console.log("📝 Updating frontend contract addresses...");
    const fs = require('fs');
    const configPath = 'frontend/src/config/contracts.ts';
    let configContent = fs.readFileSync(configPath, 'utf8');

    // Replace the old DogeJoin address
    const oldDogeJoinAddress = "0x09FA30f1397c9d208C3c7e7A99Ca7B4d274141c7";
    configContent = configContent.replace(oldDogeJoinAddress, newDogeJoinAddress);

    fs.writeFileSync(configPath, configContent);
    console.log("✅ Updated frontend config with new DogeJoin address");

    console.log("\n🎉 DogeJoin Redeployment Complete!");
    console.log("========================");
    console.log("New DogeJoin Address:", newDogeJoinAddress);
    console.log("DOGE Token Address:", CORRECT_DOGE_TOKEN);
    console.log("\n📋 Next Steps:");
    console.log("1. Update any other scripts/configs that reference the old DogeJoin address");
    console.log("2. Test the CDP functionality with the new DogeJoin contract");
    console.log("3. The old DogeJoin contract can be abandoned");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error redeploying DogeJoin:", error);
        process.exit(1);
    });