import hre from "hardhat";
import fs from "fs";

async function main() {
    console.log("🚀 Redeploying Pot contract on BSC...\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", balance.toString());

    const network = await hre.ethers.provider.getNetwork();
    const chainId = Number(network.chainId);
    console.log("Chain ID:", chainId);

    // Get Vat address from existing deployment
    let vatAddress;
    try {
        const addresses = JSON.parse(fs.readFileSync('./deployments/mainnet-addresses.json', 'utf8'));
        vatAddress = addresses.core.vat;
        console.log("Using Vat address:", vatAddress);
    } catch (error) {
        console.error("❌ Could not read deployment addresses. Make sure mainnet-addresses.json exists.");
        process.exit(1);
    }

    // Deploy Pot
    console.log("\n🏦 Deploying Pot contract...");
    const Pot = await hre.ethers.getContractFactory("Pot");
    const pot = await Pot.deploy(vatAddress);
    await pot.waitForDeployment();
    const potAddress = await pot.getAddress();
    console.log("✅ Pot deployed to:", potAddress);

    // Update deployment addresses
    const addresses = JSON.parse(fs.readFileSync('./deployments/mainnet-addresses.json', 'utf8'));
    addresses.core.pot = potAddress;
    fs.writeFileSync('./deployments/mainnet-addresses.json', JSON.stringify(addresses, null, 2));
    console.log("💾 Updated mainnet-addresses.json with new Pot address");

    console.log("\n🎉 Pot Contract Redeployed:");
    console.log("===========================");
    console.log(`Pot: ${potAddress}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error during deployment:", error);
        process.exit(1);
    });