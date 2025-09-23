const { ethers } = require("hardhat");

async function main() {
    console.log("🔧 Updating Price Feed Addresses...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    // Contract addresses
    const addresses = {
        spot: "0x5f029d9b48162a809919e595c2b712f5cb039d19"
    };

    // Correct Chainlink feed addresses
    const CORRECT_DOGE_FEED = "0x3E609D3Ab5ad650b3e5a4F3a0B1AA4F94329C470";
    const CORRECT_SHIB_FEED = "0x23336a53F95A6b78DDa5967CDDaCe12390ff010E";

    console.log("🔧 Updating price feeds in Spot contract...");

    const spot = await ethers.getContractAt("Spot", addresses.spot);

    // Update DOGE-A price feed
    console.log("Updating DOGE-A price feed...");
    const dogeIlk = ethers.encodeBytes32String("DOGE-A");
    await spot["file(bytes32,bytes32,address)"](
        dogeIlk,
        ethers.encodeBytes32String("pip"),
        CORRECT_DOGE_FEED
    );
    console.log("✅ DOGE-A price feed updated to:", CORRECT_DOGE_FEED);

    // Update SHIB-A price feed
    console.log("Updating SHIB-A price feed...");
    const shibIlk = ethers.encodeBytes32String("SHIB-A");
    await spot["file(bytes32,bytes32,address)"](
        shibIlk,
        ethers.encodeBytes32String("pip"),
        CORRECT_SHIB_FEED
    );
    console.log("✅ SHIB-A price feed updated to:", CORRECT_SHIB_FEED);

    // Verify the updates
    const updatedDogeIlk = await spot.ilks(dogeIlk);
    const updatedShibIlk = await spot.ilks(shibIlk);
    console.log("🔍 DOGE-A pip after update:", updatedDogeIlk.pip);
    console.log("🔍 SHIB-A pip after update:", updatedShibIlk.pip);

    // Poke both spot prices
    console.log("\n🔄 Poking spot prices...");
    try {
        await spot.poke(dogeIlk);
        console.log("✅ DOGE-A spot price poked");
    } catch (error) {
        console.log("⚠️ DOGE poke failed:", error.message);
    }

    try {
        await spot.poke(shibIlk);
        console.log("✅ SHIB-A spot price poked");
    } catch (error) {
        console.log("⚠️ SHIB poke failed:", error.message);
    }

    // Check updated spot prices
    try {
        const finalDogeIlk = await spot.ilks(dogeIlk);
        console.log("📊 DOGE-A spot price:", finalDogeIlk.spot.toString());
    } catch (error) {
        console.log("⚠️ Could not read DOGE spot price:", error.message);
    }

    try {
        const finalShibIlk = await spot.ilks(shibIlk);
        console.log("📊 SHIB-A spot price:", finalShibIlk.spot.toString());
    } catch (error) {
        console.log("⚠️ Could not read SHIB spot price:", error.message);
    }

    console.log("\n🎉 Price feed updates complete!");
    console.log("✅ DOGE/USD feed address updated");
    console.log("✅ SHIB/USD feed address updated");
    console.log("✅ Spot prices refreshed");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error updating price feeds:", error);
        process.exit(1);
    });