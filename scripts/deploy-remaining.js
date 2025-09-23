const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Deploying remaining USDog contracts on BSC...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", balance.toString());

    const network = await ethers.provider.getNetwork();
    const chainId = Number(network.chainId);
    console.log("Chain ID:", chainId);

    // Contract factories
    const End = await ethers.getContractFactory("End");
    const Multicall = await ethers.getContractFactory("Multicall");

    // ===============================
    // Deploy Emergency System
    // ===============================
    console.log("\n🚨 Deploying emergency system...");

    const end = await End.deploy();
    await end.waitForDeployment();
    const endAddress = await end.getAddress();
    console.log("✅ End deployed to:", endAddress);

    // ===============================
    // Deploy Utilities
    // ===============================
    console.log("\n🔧 Deploying utilities...");

    const multicall = await Multicall.deploy();
    await multicall.waitForDeployment();
    const multicallAddress = await multicall.getAddress();
    console.log("✅ Multicall deployed to:", multicallAddress);

    // ===============================
    // Summary
    // ===============================
    console.log("\n🎉 Remaining Contracts Deployed:");
    console.log("================================");

    const addresses = {
        end: endAddress,
        multicall: multicallAddress
    };

    Object.entries(addresses).forEach(([name, address]) => {
        console.log(`${name}: ${address}`);
    });

    // Save addresses to file
    const fs = require('fs');
    fs.writeFileSync('./remaining-addresses.json', JSON.stringify(addresses, null, 2));
    console.log("\n💾 Addresses saved to remaining-addresses.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error during deployment:", error);
        process.exit(1);
    });