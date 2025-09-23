const { ethers } = require("hardhat");

async function main() {
    console.log("🎯 Configuring Spot Contract on BSC Mainnet...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Configuring with account:", deployer.address);

    // Contract addresses from deployment
    const addresses = {
        spot: "0x5f029d9b48162a809919e595c2b712f5cb039d19",
        dogePriceFeed: "0x6c5aEf4F9A41502Ff9Cd60908bAdCCc3233e536f",
        shibPriceFeed: "0xA08FdbDD45e232420Fd379555A8e69cF00FBAdB2"
    };

    const RAY = ethers.parseUnits("1", 27); // 10^27

    // Get contract instances
    const spot = await ethers.getContractAt("Spot", addresses.spot);

    console.log("🔧 Configuring Spot contract...");

    // 1. Configure Spot price feeds
    console.log("💰 Configuring price feeds...");
    await spot["file(bytes32,bytes32,address)"](
        ethers.encodeBytes32String("DOGE-A"),
        ethers.encodeBytes32String("pip"),
        addresses.dogePriceFeed
    );
    await spot["file(bytes32,bytes32,address)"](
        ethers.encodeBytes32String("SHIB-A"),
        ethers.encodeBytes32String("pip"),
        addresses.shibPriceFeed
    );
    console.log("✅ Configured price feed sources");

    // 2. Set liquidation ratios (150% for both)
    console.log("⚖️ Setting liquidation ratios...");
    const liquidationRatio = (RAY * 150n) / 100n; // 150%
    await spot["file(bytes32,bytes32,uint256)"](
        ethers.encodeBytes32String("DOGE-A"),
        ethers.encodeBytes32String("mat"),
        liquidationRatio
    );
    await spot["file(bytes32,bytes32,uint256)"](
        ethers.encodeBytes32String("SHIB-A"),
        ethers.encodeBytes32String("mat"),
        liquidationRatio
    );
    console.log("✅ Set liquidation ratios to 150%");

    // 3. Poke the spot prices to update them
    console.log("🔄 Updating spot prices...");
    await spot.poke(ethers.encodeBytes32String("DOGE-A"));
    await spot.poke(ethers.encodeBytes32String("SHIB-A"));
    console.log("✅ Updated spot prices");

    console.log("\n🎉 Spot contract configuration completed!");
    console.log("The collateral pricing system is now active.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error during Spot configuration:", error);
        process.exit(1);
    });