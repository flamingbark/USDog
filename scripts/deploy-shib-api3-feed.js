// SPDX-License-Identifier: AGPL-3.0-or-later
const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Deploying API3 SHIB Price Feed on BSC Mainnet...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    // API3 Proxy address for SHIB/USD
    const api3Proxy = "0x23336a53F95A6b78DDa5967CDDaCe12390ff010E";

    console.log("📡 Using API3 proxy:", api3Proxy);

    // Deploy Api3PriceFeed
    console.log("🔨 Deploying Api3PriceFeed...");
    const Api3PriceFeed = await ethers.getContractFactory("Api3PriceFeed");
    const shibApi3Feed = await Api3PriceFeed.deploy(api3Proxy);

    await shibApi3Feed.waitForDeployment();
    const shibApi3FeedAddress = await shibApi3Feed.getAddress();

    console.log("✅ Api3PriceFeed deployed to:", shibApi3FeedAddress);

    // Verify the deployment
    console.log("\n🔍 Verifying deployment...");
    const feed = await ethers.getContractAt("Api3PriceFeed", shibApi3FeedAddress);
    const wardsDeployer = await feed.wards(deployer.address);
    console.log("Deployer auth (wards):", wardsDeployer ? "Yes" : "No");

    // Test peek (should return price if valid)
    try {
        const [price, valid] = await feed.peek();
        console.log("Test peek - Valid:", valid);
        if (valid) {
            console.log("Test peek - Price (WAD):", ethers.formatUnits(price, 18));
        }
    } catch (error) {
        console.log("Test peek failed (expected if not poked yet):", error.message);
    }

    console.log("\n📝 Next steps:");
    console.log("1. Update shibPriceFeed in scripts/configure-spot.js with:", shibApi3FeedAddress);
    console.log("2. Run: npx hardhat run scripts/configure-spot.js --network bsc");
    console.log("3. The new feed will be set as pip for SHIB-A and poked to update spot price.");

    // Save address to a file for easy copy-paste
    const fs = require('fs');
    fs.writeFileSync('shib-api3-feed-address.json', JSON.stringify({ shibApi3Feed: shibApi3FeedAddress }, null, 2));
    console.log("\n💾 Address saved to: shib-api3-feed-address.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error deploying API3 SHIB feed:", error);
        process.exit(1);
    });