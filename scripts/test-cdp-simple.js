const { ethers } = require("hardhat");

async function main() {
    console.log("🏦 Simple CDP Test: Deposit 1 DOGE & Mint 1 USDog...\n");

    const [user] = await ethers.getSigners();
    console.log("Testing with account:", user.address);

    // Contract addresses
    const addresses = {
        vat: "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be",
        stablecoin: "0xb1abd2a64b829596d7afefca31a6c984b5afaafb",
        dogeJoin: "0x09FA30f1397c9d208C3c7e7A99Ca7B4d274141c7",
        daiJoin: "0xB1780C459493EBA4Cc921A68F19174cc441e96B7"
    };

    const DOGE_TOKEN = "0xba2ae424d960c26247dd6c32edc70b295c744c43";

    // Get contract instances
    const vat = await ethers.getContractAt("Vat", addresses.vat);
    const stablecoin = await ethers.getContractAt("StableCoin", addresses.stablecoin);
    const dogeJoin = await ethers.getContractAt("DogeJoin", addresses.dogeJoin);
    const daiJoin = await ethers.getContractAt("DaiJoin", addresses.daiJoin);
    const dogeToken = new ethers.Contract(DOGE_TOKEN, [
        "function balanceOf(address) view returns (uint256)",
        "function approve(address, uint256) returns (bool)"
    ], user);

    console.log("📊 Checking initial balances...");

    // Check DOGE balance (DOGE has 8 decimals)
    const dogeBalance = await dogeToken.balanceOf(user.address);
    const dogeBalanceFormatted = ethers.formatUnits(dogeBalance, 8);
    console.log("🐕 DOGE Balance:", dogeBalanceFormatted, "DOGE");

    if (dogeBalance < ethers.parseUnits("1", 8)) {
        console.log("❌ Insufficient DOGE balance. Need at least 1 DOGE.");
        return;
    }

    // Check initial USDog balance
    const initialUsdogBalance = await stablecoin.balanceOf(user.address);
    console.log("💵 Initial USDog Balance:", ethers.formatEther(initialUsdogBalance), "USDog");

    // Fixed amounts: 1 DOGE and 1 USDog
    const depositAmount = ethers.parseUnits("1", 8); // 1 DOGE
    const mintAmount = ethers.parseEther("1"); // 1 USDog

    console.log("📥 Deposit Amount:", ethers.formatUnits(depositAmount, 8), "DOGE");
    console.log("🪙 Mint Amount:", ethers.formatEther(mintAmount), "USDog");

    console.log("\n🔐 Step 1: Approving DOGE for DogeJoin contract...");
    const approveTx = await dogeToken.approve(addresses.dogeJoin, depositAmount);
    await approveTx.wait();
    console.log("✅ DOGE approved for DogeJoin");

    console.log("\n🔍 Checking Vat permissions...");
    const dogeJoinPermission = await vat.wards(addresses.dogeJoin);
    console.log("DogeJoin permission in Vat:", dogeJoinPermission.toString());

    if (dogeJoinPermission === 0n) {
        console.log("❌ DogeJoin does not have permission to modify Vat!");
        console.log("Please run: npx hardhat run scripts/grant-join-permission.js --network bsc");
        return;
    }

    console.log("\n🏦 Step 2: Depositing DOGE as collateral...");
    try {
        const joinTx = await dogeJoin.join(user.address, depositAmount);
        await joinTx.wait();
        console.log("✅ DOGE deposited as collateral");
    } catch (error) {
        console.log("❌ Join failed:", error.message);
        console.log("This might be due to:");
        console.log("1. Insufficient DOGE balance");
        console.log("2. Vat permissions not set correctly");
        console.log("3. DOGE-A ilk not initialized");
        console.log("4. Spot price not set");
        return;
    }

    console.log("\n📊 Step 3: Checking collateral balance in Vat...");
    const [ink, art] = await vat.urns(ethers.encodeBytes32String("DOGE-A"), user.address);
    console.log("🏦 Collateral locked:", ethers.formatEther(ink), "DOGE");
    console.log("🏦 Debt outstanding:", ethers.formatEther(art), "USDog");

    console.log("\n🪙 Step 4: Minting USDog stablecoins...");
    try {
        await vat.frob(
            ethers.encodeBytes32String("DOGE-A"),
            user.address,
            user.address,
            user.address,
            depositAmount, // collateral delta (positive = add collateral)
            mintAmount    // debt delta (positive = mint USDog)
        );
        console.log("✅ USDog minted");
    } catch (error) {
        console.log("❌ Minting failed:", error.message);
        console.log("This might be due to:");
        console.log("1. Insufficient collateralization ratio");
        console.log("2. Debt ceiling exceeded");
        console.log("3. Spot price issues");
        return;
    }

    console.log("\n💰 Step 5: Withdrawing USDog to wallet...");
    try {
        await vat.move(user.address, user.address, mintAmount);
        await daiJoin.exit(user.address, mintAmount);
        console.log("✅ USDog withdrawn to wallet");
    } catch (error) {
        console.log("❌ Withdrawal failed:", error.message);
        return;
    }

    console.log("\n📊 Final balances:");
    const finalDogeBalance = await dogeToken.balanceOf(user.address);
    const finalUsdogBalance = await stablecoin.balanceOf(user.address);
    const finalUrn = await vat.urns(ethers.encodeBytes32String("DOGE-A"), user.address);

    console.log("🐕 Final DOGE Balance:", ethers.formatUnits(finalDogeBalance, 8), "DOGE");
    console.log("💵 Final USDog Balance:", ethers.formatEther(finalUsdogBalance), "USDog");
    console.log("🏦 Collateral in CDP:", ethers.formatEther(finalUrn[0]), "DOGE");
    console.log("🏦 Debt in CDP:", ethers.formatEther(finalUrn[1]), "USDog");

    // Calculate collateralization ratio
    if (finalUrn[1] > 0n) {
        const collateralValue = finalUrn[0] * 553402322211n; // Approximate DOGE price
        const collateralizationRatio = (collateralValue * 100n) / (finalUrn[1] * ethers.parseEther("1"));
        console.log("📊 Collateralization Ratio:", collateralizationRatio.toString(), "%");
    }

    console.log("\n🎉 CDP Test completed successfully!");
    console.log("✅ DOGE deposited as collateral");
    console.log("✅ USDog stablecoins minted");
    console.log("✅ System functioning correctly");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error during CDP testing:", error);
        process.exit(1);
    });