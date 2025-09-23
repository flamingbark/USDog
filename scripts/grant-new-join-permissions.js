const { ethers } = require("hardhat");

async function main() {
    console.log("🔑 Granting Permissions to New Join Contracts...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Configuring with account:", deployer.address);

    // Contract addresses
    const addresses = {
        vat: "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be",
        newShibJoin: "0xd88AF8a38Fc3719668FEae8477A0aeA584Ac69A5",
        newDogeJoin: "0x794eE9786535056D8858DfbF98cEafCA5ca23526"
    };

    // Get contract instances
    const vat = await ethers.getContractAt("Vat", addresses.vat);

    console.log("🔧 Granting permissions...");

    // Grant Join contracts permission to modify Vat
    await vat.rely(addresses.newShibJoin);
    console.log("✅ Granted new ShibJoin permission to modify Vat");

    await vat.rely(addresses.newDogeJoin);
    console.log("✅ Granted new DogeJoin permission to modify Vat");

    // Verify permissions
    console.log("\n🔍 Verifying permissions...");
    const shibPermission = await vat.wards(addresses.newShibJoin);
    const dogePermission = await vat.wards(addresses.newDogeJoin);
    
    console.log("New ShibJoin permission:", shibPermission.toString());
    console.log("New DogeJoin permission:", dogePermission.toString());

    console.log("\n🎉 New Join contract permissions granted!");
    console.log("\n📋 New Contract Addresses:");
    console.log("New ShibJoin:", addresses.newShibJoin);
    console.log("New DogeJoin:", addresses.newDogeJoin);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error granting permissions:", error);
        process.exit(1);
    });