const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Debugging Spot Contract...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Debugging with account:", deployer.address);

    // Contract addresses from deployment
    const addresses = {
        spot: "0x5f029d9b48162a809919e595c2b712f5cb039d19",
        vat: "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be",
        dogePriceFeed: "0x6c5aEf4F9A41502Ff9Cd60908bAdCCc3233e536f",
        shibPriceFeed: "0x93b2d0eDf1989aD97959D05BE863446a1B34b213"
    };

    // Get contract instances
    const spot = await ethers.getContractAt("Spot", addresses.spot);
    const vat = await ethers.getContractAt("Vat", addresses.vat);
    const dogeFeed = await ethers.getContractAt("AggregatorV3Interface", addresses.dogePriceFeed);
    const shibFeed = await ethers.getContractAt("AggregatorV3Interface", addresses.shibPriceFeed);

    console.log("🔧 Checking Spot contract configuration...");

    // Check what Spot contract has configured
    const dogePip = await spot.ilks(ethers.encodeBytes32String("DOGE-A"));
    const shibPip = await spot.ilks(ethers.encodeBytes32String("SHIB-A"));

    console.log("DOGE-A pip (price feed):", dogePip[0]);
    console.log("DOGE-A mat (liquidation ratio):", dogePip[1].toString());
    console.log("SHIB-A pip (price feed):", shibPip[0]);
    console.log("SHIB-A mat (liquidation ratio):", shibPip[1].toString());

    // Check raw price feed data
    console.log("\n💰 Checking raw price feed data...");
    const dogePrice = await dogeFeed.latestRoundData();
    const shibPrice = await shibFeed.latestRoundData();

    console.log("DOGE price:", dogePrice[1].toString(), "(answer)");
    console.log("DOGE updatedAt:", new Date(Number(dogePrice[3]) * 1000).toISOString());
    console.log("SHIB price:", shibPrice[1].toString(), "(answer)");
    console.log("SHIB updatedAt:", new Date(Number(shibPrice[3]) * 1000).toISOString());

    // Try to peek at what Spot contract sees
    console.log("\n👀 Checking Spot contract peek...");
    try {
        const dogePeek = await spot.peeks(ethers.encodeBytes32String("DOGE-A"));
        console.log("DOGE-A peek result:", dogePeek[0].toString(), "valid:", dogePeek[1]);
    } catch (e) {
        console.log("DOGE-A peek failed:", e.message);
    }

    try {
        const shibPeek = await spot.peeks(ethers.encodeBytes32String("SHIB-A"));
        console.log("SHIB-A peek result:", shibPeek[0].toString(), "valid:", shibPeek[1]);
    } catch (e) {
        console.log("SHIB-A peek failed:", e.message);
    }

    console.log("\n🎯 Debug complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error debugging spot:", error);
        process.exit(1);
    });