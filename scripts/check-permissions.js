const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Checking Contract Permissions...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Checking with account:", deployer.address);

    // Contract addresses from deployment
    const addresses = {
        vat: "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be",
        spot: "0x5f029d9b48162a809919e595c2b712f5cb039d19",
        dogeJoin: "0x09FA30f1397c9d208C3c7e7A99Ca7B4d274141c7",
        shibJoin: "0x5E03607Ce6ca0382c054e5E978a3d31A57758Df3",
        daiJoin: "0xB1780C459493EBA4Cc921A68F19174cc441e96B7"
    };

    // Get contract instances
    const vat = await ethers.getContractAt("Vat", addresses.vat);

    console.log("🔧 Checking permissions...");

    // Check permissions
    const spotPermission = await vat.wards(addresses.spot);
    const dogeJoinPermission = await vat.wards(addresses.dogeJoin);
    const shibJoinPermission = await vat.wards(addresses.shibJoin);
    const daiJoinPermission = await vat.wards(addresses.daiJoin);

    console.log("Spot permission:", spotPermission.toString());
    console.log("DogeJoin permission:", dogeJoinPermission.toString());
    console.log("ShibJoin permission:", shibJoinPermission.toString());
    console.log("DaiJoin permission:", daiJoinPermission.toString());

    console.log("\n🎯 Permission check complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error checking permissions:", error);
        process.exit(1);
    });