const { ethers } = require("hardhat");

async function main() {
    console.log("🏦 Initializing DOGE-A Ilk in Vat...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Initializing with account:", deployer.address);

    // Contract addresses
    const addresses = {
        vat: "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be"
    };

    // Get contract instances
    const vat = await ethers.getContractAt("Vat", addresses.vat);

    console.log("🔧 Initializing DOGE-A ilk...");

    try {
        await vat.init(ethers.encodeBytes32String("DOGE-A"));
        console.log("✅ DOGE-A ilk initialized in Vat");
    } catch (error) {
        if (error.message.includes("ilk-already-init")) {
            console.log("✅ DOGE-A ilk already initialized");
        } else {
            console.log("❌ Failed to initialize DOGE-A ilk:", error.message);
            return;
        }
    }

    // Check the ilk data
    console.log("\n📊 Checking DOGE-A ilk data...");
    const ilkData = await vat.ilks(ethers.encodeBytes32String("DOGE-A"));
    console.log("DOGE-A ilk data:", {
        Art: ilkData[0].toString(),
        rate: ilkData[1].toString(),
        spot: ilkData[2].toString(),
        line: ilkData[3].toString(),
        dust: ilkData[4].toString()
    });

    console.log("\n🎉 Vat ilk initialization complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error initializing Vat ilk:", error);
        process.exit(1);
    });