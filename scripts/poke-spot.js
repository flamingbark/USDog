const { ethers } = require("hardhat");

async function main() {
    console.log("🔄 Poking Spot Prices...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Poking with account:", deployer.address);

    // Contract addresses from deployment
    const addresses = {
        spot: "0x5f029d9b48162a809919e595c2b712f5cb039d19",
        vat: "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be"
    };

    // Get contract instances
    const spot = await ethers.getContractAt("Spot", addresses.spot);
    const vat = await ethers.getContractAt("Vat", addresses.vat);

    console.log("🔧 Poking spot prices...");

    // Poke the spot prices to update them
    console.log("🔄 Updating DOGE-A spot price...");
    await spot.poke(ethers.encodeBytes32String("DOGE-A"));
    console.log("✅ Updated DOGE-A spot price");

    console.log("🔄 Updating SHIB-A spot price...");
    await spot.poke(ethers.encodeBytes32String("SHIB-A"));
    console.log("✅ Updated SHIB-A spot price");

    // Check the updated spot prices
    console.log("\n📊 Checking updated spot prices...");
    const dogeIlk = await vat.ilks(ethers.encodeBytes32String("DOGE-A"));
    const shibIlk = await vat.ilks(ethers.encodeBytes32String("SHIB-A"));

    console.log("DOGE-A spot price:", dogeIlk[2].toString());
    console.log("SHIB-A spot price:", shibIlk[2].toString());

    console.log("\n🎉 Spot prices updated!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error poking spot prices:", error);
        process.exit(1);
    });