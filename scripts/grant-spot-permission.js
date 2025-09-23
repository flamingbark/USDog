const { ethers } = require("hardhat");

async function main() {
    console.log("🔑 Granting Spot Contract Permissions...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Configuring with account:", deployer.address);

    // Contract addresses from deployment
    const addresses = {
        vat: "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be",
        spot: "0x5f029d9b48162a809919e595c2b712f5cb039d19"
    };

    // Get contract instances
    const vat = await ethers.getContractAt("Vat", addresses.vat);

    console.log("🔧 Granting permissions...");

    // Grant Spot contract permission to modify Vat
    await vat.rely(addresses.spot);
    console.log("✅ Granted Spot contract permission to modify Vat");

    console.log("\n🎉 Permission granted!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error granting permissions:", error);
        process.exit(1);
    });