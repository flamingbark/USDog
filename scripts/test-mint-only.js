const { ethers } = require("hardhat");

async function main() {
    console.log("🪙 Mint USDog Against Deposited Collateral...\n");

    const [user] = await ethers.getSigners();
    console.log("Testing with account:", user.address);

    // Contract addresses
    const addresses = {
        vat: "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be",
        stablecoin: "0xb1abd2a64b829596d7afefca31a6c984b5afaafb",
        daiJoin: "0xB1780C459493EBA4Cc921A68F19174cc441e96B7"
    };

    // Get contract instances
    const vat = await ethers.getContractAt("Vat", addresses.vat);
    const stablecoin = await ethers.getContractAt("StableCoin", addresses.stablecoin);
    const daiJoin = await ethers.getContractAt("DaiJoin", addresses.daiJoin);

    console.log("📊 Checking current position...");

    // Check current collateral and debt
    const [ink, art] = await vat.urns(ethers.encodeBytes32String("DOGE-A"), user.address);
    console.log("🏦 Current collateral (ink):", ethers.formatEther(ink), "DOGE");
    console.log("🏦 Current debt (art):", ethers.formatEther(art), "USDog");

    // Check current USDog balance
    const initialUsdogBalance = await stablecoin.balanceOf(user.address);
    console.log("💵 Current USDog Balance:", ethers.formatEther(initialUsdogBalance), "USDog");

    if (ink === 0n) {
        console.log("❌ No collateral deposited. Please run deposit test first.");
        console.log("Run: npx hardhat run scripts/test-deposit-only.js --network bsc");
        return;
    }

    // Calculate how much USDog we can mint
    // With 1 DOGE collateral at ~$0.55 and 150% liquidation ratio:
    // Max USDog = (1 * 0.55) / 1.5 = 0.3667 USDog
    // Let's mint a small amount: 0.001 USDog
    const mintAmount = ethers.parseEther("0.001"); // 0.001 USDog
    console.log("🪙 Mint Amount:", ethers.formatEther(mintAmount), "USDog");

    console.log("\n🪙 Step 1: Minting USDog stablecoins...");
    try {
        await vat.frob(
            ethers.encodeBytes32String("DOGE-A"),
            user.address,
            user.address,
            user.address,
            0,        // collateral delta (0 = no change)
            mintAmount // debt delta (positive = mint USDog)
        );
        console.log("✅ USDog minted in Vat");
    } catch (error) {
        console.log("❌ Minting failed:", error.message);
        console.log("This might be due to:");
        console.log("1. Insufficient collateralization ratio");
        console.log("2. Debt ceiling exceeded");
        console.log("3. Spot price issues");
        console.log("4. Dust limit not met");
        return;
    }

    console.log("\n💰 Step 2: Withdrawing USDog to wallet...");
    try {
        await vat.move(user.address, user.address, mintAmount);
        await daiJoin.exit(user.address, mintAmount);
        console.log("✅ USDog withdrawn to wallet");
    } catch (error) {
        console.log("❌ Withdrawal failed:", error.message);
        return;
    }

    console.log("\n📊 Final position:");
    const [finalInk, finalArt] = await vat.urns(ethers.encodeBytes32String("DOGE-A"), user.address);
    const finalUsdogBalance = await stablecoin.balanceOf(user.address);

    console.log("🏦 Final collateral (ink):", ethers.formatEther(finalInk), "DOGE");
    console.log("🏦 Final debt (art):", ethers.formatEther(finalArt), "USDog");
    console.log("💵 Final USDog Balance:", ethers.formatEther(finalUsdogBalance), "USDog");

    // Calculate collateralization ratio
    if (finalArt > 0n) {
        const collateralValue = finalInk * 553402322211n; // Approximate DOGE price
        const collateralizationRatio = (collateralValue * 100n) / (finalArt * ethers.parseEther("1"));
        console.log("📊 Collateralization Ratio:", collateralizationRatio.toString(), "%");
    }

    console.log("\n🎉 Mint test completed successfully!");
    console.log("✅ USDog minted against deposited collateral");
    console.log("✅ CDP position updated");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error during mint test:", error);
        process.exit(1);
    });