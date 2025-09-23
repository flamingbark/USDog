const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Debugging Vat ILK Configuration...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Debugging with account:", deployer.address);

    // Contract addresses
    const addresses = {
        vat: "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be",
        spot: "0x5f029d9b48162a809919e595c2b712f5cb039d19"
    };

    // Get contract instances
    const vat = await ethers.getContractAt("Vat", addresses.vat);

    console.log("🔧 Checking ILK configurations in Vat...");

    // Check DOGE-A ILK
    const dogeIlk = ethers.encodeBytes32String("DOGE-A");
    try {
        const dogeData = await vat.ilks(dogeIlk);
        console.log("🐕 DOGE-A ILK:");
        console.log("  Art (total debt):", dogeData[0].toString());
        console.log("  rate:", dogeData[1].toString());
        console.log("  spot (price with margin):", dogeData[2].toString());
        console.log("  line (debt ceiling):", dogeData[3].toString()); 
        console.log("  dust (min debt):", dogeData[4].toString());
    } catch (error) {
        console.log("❌ DOGE-A ILK read failed:", error.message);
    }

    // Check SHIB-A ILK
    const shibIlk = ethers.encodeBytes32String("SHIB-A");
    try {
        const shibData = await vat.ilks(shibIlk);
        console.log("🐕 SHIB-A ILK:");
        console.log("  Art (total debt):", shibData[0].toString());
        console.log("  rate:", shibData[1].toString());
        console.log("  spot (price with margin):", shibData[2].toString());
        console.log("  line (debt ceiling):", shibData[3].toString());
        console.log("  dust (min debt):", shibData[4].toString());
    } catch (error) {
        console.log("❌ SHIB-A ILK read failed:", error.message);
    }

    // Check system-wide settings
    console.log("\n📊 System-wide settings:");
    try {
        const Line = await vat.Line();
        console.log("Total debt ceiling (Line):", Line.toString());
        
        const live = await vat.live();
        console.log("System live status:", live.toString());
    } catch (error) {
        console.log("❌ System settings read failed:", error.message);
    }

    console.log("\n🎯 Debug complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error debugging Vat ILKs:", error);
        process.exit(1);
    });