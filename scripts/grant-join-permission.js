const { ethers } = require("hardhat");

async function main() {
    console.log("🔑 Granting Join Contracts Permissions...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Configuring with account:", deployer.address);

    // Contract addresses from deployment
    const addresses = {
        vat: "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be",
        dogeJoin: "0x09FA30f1397c9d208C3c7e7A99Ca7B4d274141c7",
        shibJoin: "0x5E03607Ce6ca0382c054e5E978a3d31A57758Df3",
        daiJoin: "0xB1780C459493EBA4Cc921A68F19174cc441e96B7"
    };

    // Get contract instances
    const vat = await ethers.getContractAt("Vat", addresses.vat);

    console.log("🔧 Granting permissions...");

    // Grant Join contracts permission to modify Vat
    await vat.rely(addresses.dogeJoin);
    console.log("✅ Granted DogeJoin permission to modify Vat");

    await vat.rely(addresses.shibJoin);
    console.log("✅ Granted ShibJoin permission to modify Vat");

    await vat.rely(addresses.daiJoin);
    console.log("✅ Granted DaiJoin permission to modify Vat");

    console.log("\n🎉 Join permissions granted!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error granting permissions:", error);
        process.exit(1);
    });