const { ethers } = require("hardhat");

async function main() {
    console.log("🏛️ Configuring Auction Parameters for Liquidations...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Configuring with account:", deployer.address);

    // Contract addresses from deployment
    const addresses = {
        vat: "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be",
        spot: "0x5f029d9b48162a809919e595c2b712f5cb039d19",
        dogePriceFeed: "0x6c5aEf4F9A41502Ff9Cd60908bAdCCc3233e536f",
        shibPriceFeed: "0x93b2d0eDf1989aD97959D05BE863446a1B34b213",
        dog: "0x8F8f0E79cE4AAaC0E19826C3F730DC82B107AB88",
        calc: "0x97acD6e75a93De8eB1b84E944Ac6319710F04636",
        dogeClipper: "0x6bD154383406C9fed481C2c215e19332B58AE0D8"
    };

    const RAY = ethers.parseUnits("1", 27); // 10^27
    const WAD = ethers.parseEther("1"); // 10^18

    console.log("⚙️ Configuring liquidation auction parameters...");

    // 1. Configure Spot contract price feeds and liquidation ratios
    console.log("💰 Configuring Spot contract price feeds...");

    const spotContract = new ethers.Contract(addresses.spot, [
        "function file(bytes32, bytes32, address) external",
        "function file(bytes32, bytes32, uint256) external"
    ], deployer);

    // Set price feed sources
    await spotContract["file(bytes32,bytes32,address)"](
        ethers.encodeBytes32String("DOGE-A"),
        ethers.encodeBytes32String("pip"),
        addresses.dogePriceFeed
    );
    await spotContract["file(bytes32,bytes32,address)"](
        ethers.encodeBytes32String("SHIB-A"),
        ethers.encodeBytes32String("pip"),
        addresses.shibPriceFeed
    );
    console.log("✅ Price feed sources configured");

    // Set liquidation ratios (150% for both)
    const liquidationRatio = (RAY * 150n) / 100n; // 150%
    await spotContract["file(bytes32,bytes32,uint256)"](
        ethers.encodeBytes32String("DOGE-A"),
        ethers.encodeBytes32String("mat"),
        liquidationRatio
    );
    await spotContract["file(bytes32,bytes32,uint256)"](
        ethers.encodeBytes32String("SHIB-A"),
        ethers.encodeBytes32String("mat"),
        liquidationRatio
    );
    console.log("✅ Liquidation ratios set to 150%");

    // 2. Configure Dog contract auction parameters
    console.log("🏛️ Configuring Dog contract auction parameters...");

    const dogContract = new ethers.Contract(addresses.dog, [
        "function file(bytes32, bytes32, uint256) external"
    ], deployer);

    // Set hole (max concurrent auction lot size) - 10M USDog
    const hole = ethers.parseUnits("10000000", 45); // 10M RAD
    await dogContract["file(bytes32,bytes32,uint256)"](
        ethers.encodeBytes32String("hole"),
        ethers.encodeBytes32String(""),
        hole
    );

    // Set hole for DOGE-A specifically
    await dogContract["file(bytes32,bytes32,uint256)"](
        ethers.encodeBytes32String("DOGE-A"),
        ethers.encodeBytes32String("hole"),
        hole
    );

    // Set hole for SHIB-A specifically
    await dogContract["file(bytes32,bytes32,uint256)"](
        ethers.encodeBytes32String("SHIB-A"),
        ethers.encodeBytes32String("hole"),
        hole
    );
    console.log("✅ Auction hole set to 10M USDog");

    // 3. Configure Clipper contract auction parameters
    console.log("🔨 Configuring Clipper contract auction parameters...");

    const clipperContract = new ethers.Contract(addresses.dogeClipper, [
        "function file(bytes32, uint256) external"
    ], deployer);

    // Set auction duration (buf) - 4 hours
    const buf = 4 * 3600; // 4 hours in seconds
    await clipperContract["file(bytes32,uint256)"](
        ethers.encodeBytes32String("buf"),
        buf
    );

    // Set price increase (tail) - 2 hours
    const tail = 2 * 3600; // 2 hours in seconds
    await clipperContract["file(bytes32,uint256)"](
        ethers.encodeBytes32String("tail"),
        tail
    );

    // Set minimum bid increase (cusp) - 0.3 WAD (30%)
    const cusp = (WAD * 3n) / 10n; // 0.3 WAD
    await clipperContract["file(bytes32,uint256)"](
        ethers.encodeBytes32String("cusp"),
        cusp
    );

    // Set maximum auction duration (chip) - 0.02 WAD (2%)
    const chip = (WAD * 2n) / 100n; // 0.02 WAD
    await clipperContract["file(bytes32,uint256)"](
        ethers.encodeBytes32String("chip"),
        chip
    );

    // Set flat fee (tip) - 0 USDog
    const tip = 0;
    await clipperContract["file(bytes32,uint256)"](
        ethers.encodeBytes32String("tip"),
        tip
    );
    console.log("✅ DOGE Clipper auction parameters configured");

    console.log("\n🎉 Auction parameters configuration completed!");
    console.log("The liquidation system is now fully configured with:");
    console.log("- 150% liquidation ratios");
    console.log("- 10M USDog max auction size");
    console.log("- 4-hour auction duration");
    console.log("- 30% minimum bid increase");
    console.log("- 2% max price drop per hour");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error during auction configuration:", error);
        process.exit(1);
    });