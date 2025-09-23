const { ethers } = require("hardhat");

async function main() {
    console.log("🏦 Full CDP Test: Deposit DOGE and Mint USDog...\n");

    const [user] = await ethers.getSigners();
    console.log("Testing with account:", user.address);

    // Contract addresses
    const addresses = {
        vat: "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be",
        dogeJoin: "0x9d57797222EE904d213E7637E429d10C8ea7125d",
        stablecoin: "0xb1abd2a64b829596d7afefca31a6c984b5afaafb",
        daiJoin: "0xB1780C459493EBA4Cc921A68F19174cc441e96B7",
        dogeToken: "0xba2ae424d960c26247dd6c32edc70b295c744c43"
    };

    // Get contract instances
    const vat = await ethers.getContractAt("Vat", addresses.vat);
    const dogeJoin = await ethers.getContractAt("DogeJoin", addresses.dogeJoin);
    const stablecoin = await ethers.getContractAt("StableCoin", addresses.stablecoin);
    const daiJoin = await ethers.getContractAt("DaiJoin", addresses.daiJoin);
    const dogeToken = new ethers.Contract(addresses.dogeToken, [
        "function balanceOf(address) view returns (uint256)",
        "function approve(address, uint256) returns (bool)"
    ], user);

    console.log("📊 Checking initial state...");

    // Check DOGE balance
    const initialDogeBalance = await dogeToken.balanceOf(user.address);
    console.log("🐕 Initial DOGE Balance:", ethers.formatUnits(initialDogeBalance, 8), "DOGE");

    // Check current position
    const ilk = ethers.encodeBytes32String("DOGE-A");
    const [initialInk, initialArt] = await vat.urns(ilk, user.address);
    const initialGem = await vat.gem(ilk, user.address);
    console.log("🏦 Initial CDP collateral (ink):", ethers.formatEther(initialInk), "DOGE");
    console.log("🏦 Initial CDP debt (art):", ethers.formatEther(initialArt), "USDog");
    console.log("💰 Initial gem balance:", ethers.formatEther(initialGem), "WAD");

    let gemAfterDeposit = initialGem;

    // If we don't have collateral in gem, deposit some
    if (initialGem == 0n) {
        // Deposit amount: 1 DOGE
        const depositAmount = ethers.parseUnits("1", 8); // 1 DOGE
        console.log("📥 Deposit Amount:", ethers.formatUnits(depositAmount, 8), "DOGE");

        console.log("\n🔐 Step 1: Approving DOGE for DogeJoin...");
        await dogeToken.approve(addresses.dogeJoin, depositAmount);
        console.log("✅ DOGE approved");

        console.log("\n🏦 Step 2: Depositing DOGE as collateral...");
        await dogeJoin.join(user.address, depositAmount);
        console.log("✅ DOGE deposited");

        // Check gem balance after deposit
        gemAfterDeposit = await vat.gem(ilk, user.address);
        console.log("💰 Gem balance after deposit:", ethers.formatEther(gemAfterDeposit), "WAD");
    } else {
        console.log("ℹ️ Collateral already available in gem, proceeding to lock and mint...");
    }

    console.log("\n🔒 Step 3: Locking collateral in CDP...");
    const lockAmount = gemAfterDeposit; // Lock all available collateral
    console.log("🔒 Locking amount:", ethers.formatEther(lockAmount), "WAD");
    await vat.frob(ilk, user.address, user.address, user.address, lockAmount, 0);
    console.log("✅ Collateral locked in CDP");

    // Check position after locking
    const [inkAfterLock, artAfterLock] = await vat.urns(ilk, user.address);
    console.log("🏦 CDP collateral after lock:", ethers.formatEther(inkAfterLock), "DOGE");
    console.log("🏦 CDP debt after lock:", ethers.formatEther(artAfterLock), "USDog");

    console.log("\n🪙 Step 4: Minting USDog...");
    // Mint a small amount: 0.001 USDog
    const mintAmount = ethers.parseEther("0.001");
    console.log("🪙 Mint Amount:", ethers.formatEther(mintAmount), "USDog");

    await vat.frob(ilk, user.address, user.address, user.address, 0, mintAmount);
    console.log("✅ USDog minted in Vat");

    console.log("\n💰 Step 5: Withdrawing USDog to wallet...");
    await vat.move(user.address, addresses.daiJoin, mintAmount);
    await daiJoin.exit(user.address, mintAmount);
    console.log("✅ USDog withdrawn to wallet");

    console.log("\n📊 Final state:");
    const [finalInk, finalArt] = await vat.urns(ilk, user.address);
    const finalGem = await vat.gem(ilk, user.address);
    const finalDogeBalance = await dogeToken.balanceOf(user.address);
    const finalUsdogBalance = await stablecoin.balanceOf(user.address);

    console.log("🐕 Final DOGE Balance:", ethers.formatUnits(finalDogeBalance, 8), "DOGE");
    console.log("💰 Final gem balance:", ethers.formatEther(finalGem), "WAD");
    console.log("🏦 Final CDP collateral (ink):", ethers.formatEther(finalInk), "DOGE");
    console.log("🏦 Final CDP debt (art):", ethers.formatEther(finalArt), "USDog");
    console.log("💵 Final USDog Balance:", ethers.formatEther(finalUsdogBalance), "USDog");

    // Calculate collateralization ratio
    if (finalArt > 0n) {
        const collateralValue = finalInk * 553402322211n; // Approximate DOGE price in WAD
        const collateralizationRatio = (collateralValue * 100n) / finalArt;
        console.log("📊 Collateralization Ratio:", ethers.formatEther(collateralizationRatio), "%");
    }

    console.log("\n🎉 Full CDP test completed successfully!");
    console.log("✅ DOGE deposited and locked as collateral");
    console.log("✅ USDog minted against collateral");
    console.log("✅ USDog withdrawn to wallet");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error during full CDP test:", error);
        process.exit(1);
    });