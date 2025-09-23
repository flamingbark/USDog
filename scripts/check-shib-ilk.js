const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Checking SHIB-A Ilk Configuration...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Checking with account:", deployer.address);

    // Contract addresses
    const addresses = {
        vat: "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be",
        spot: "0x5f029d9b48162a809919e595c2b712f5cb039d19"
    };

    // Get contract instances
    const vat = await ethers.getContractAt("Vat", addresses.vat);
    const spot = await ethers.getContractAt("Spot", addresses.spot);

    console.log("🔧 Checking SHIB-A ilk configuration...");

    // Check SHIB-A ilk in Vat
    const shibIlk = ethers.encodeBytes32String("SHIB-A");
    const ilk = await vat.ilks(shibIlk);
    
    console.log("SHIB-A Art (total debt):", ilk.Art.toString());
    console.log("SHIB-A rate (accumulated rate):", ilk.rate.toString());
    console.log("SHIB-A spot (liquidation ratio):", ilk.spot.toString());
    console.log("SHIB-A line (debt ceiling):", ilk.line.toString());
    console.log("SHIB-A dust (debt floor):", ilk.dust.toString());

    // Check if rate is initialized (should not be 0)
    if (ilk.rate.eq(0)) {
        console.log("❌ SHIB-A ilk is NOT initialized! Rate is 0.");
        console.log("💡 Need to run: npx hardhat run scripts/init-shib-ilk.js --network bsc");
    } else {
        console.log("✅ SHIB-A ilk appears to be initialized");
    }

    // Check SHIB-A in Spot contract
    try {
        const spotIlk = await spot.ilks(shibIlk);
        console.log("SHIB-A pip (price feed):", spotIlk.pip);
        console.log("SHIB-A mat (liquidation ratio):", spotIlk.mat.toString());
    } catch (error) {
        console.log("❌ Error checking SHIB-A in Spot:", error.message);
    }

    console.log("\n🎯 Ilk check complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error checking ilk:", error);
        process.exit(1);
    });