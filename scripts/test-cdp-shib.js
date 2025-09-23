const { ethers } = require("hardhat");

async function main() {
    console.log("🏦 Simple CDP Test: Deposit 1 SHIB & Mint 1 USDog...\n");

    const [user] = await ethers.getSigners();
    console.log("Testing with account:", user.address);

    // Contract addresses
    const addresses = {
        vat: "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be",
        stablecoin: "0xb1abd2a64b829596d7afefca31a6c984b5afaafb",
        shibJoin: "0x5E03607Ce6ca0382c054e5E978a3d31A57758Df3",
        daiJoin: "0xB1780C459493EBA4Cc921A68F19174cc441e96B7"
    };

    const SHIB_TOKEN = "0x2859e4544c4bb03966803b044a93563bd2d0dd4d";

    // Get contract instances
    const vat = await ethers.getContractAt("Vat", addresses.vat);
    const stablecoin = await ethers.getContractAt("StableCoin", addresses.stablecoin);
    const shibJoin = await ethers.getContractAt("ShibJoin", addresses.shibJoin);
    const daiJoin = await ethers.getContractAt("DaiJoin", addresses.daiJoin);
    const shibToken = new ethers.Contract(SHIB_TOKEN, [
        "function balanceOf(address) view returns (uint256)",
        "function approve(address, uint256) returns (bool)"
    ], user);

    console.log("📊 Checking initial balances...");

    // Check SHIB balance (SHIB has 18 decimals like most ERC-20)
    const shibBalance = await shibToken.balanceOf(user.address);
    const shibBalanceFormatted = ethers.formatEther(shibBalance);
    console.log("🐕 SHIB Balance:", shibBalanceFormatted, "SHIB");

    if (shibBalance < ethers.parseEther("1")) {
        console.log("❌ Insufficient SHIB balance. Need at least 1 SHIB.");
        return;
    }

    // Check initial USDog balance
    const initialUsdogBalance = await stablecoin.balanceOf(user.address);
    console.log("💵 Initial USDog Balance:", ethers.formatEther(initialUsdogBalance), "USDog");

    // Fixed amounts: 1 SHIB and 1 USDog
    const depositAmount = ethers.parseEther("1"); // 1 SHIB
    const mintAmount = ethers.parseEther("1"); // 1 USDog

    console.log("📥 Deposit Amount:", ethers.formatEther(depositAmount), "SHIB");
    console.log("🪙 Mint Amount:", ethers.formatEther(mintAmount), "USDog");

    console.log("\n🔐 Step 1: Approving SHIB for ShibJoin contract...");
    const approveTx = await shibToken.approve(addresses.shibJoin, depositAmount);
    await approveTx.wait();
    console.log("✅ SHIB approved for ShibJoin");

    console.log("\n🔍 Checking Vat permissions...");
    const shibJoinPermission = await vat.wards(addresses.shibJoin);
    console.log("ShibJoin permission in Vat:", shibJoinPermission.toString());

    if (shibJoinPermission === 0n) {
        console.log("❌ ShibJoin does not have permission to modify Vat!");
        console.log("Please run: npx hardhat run scripts/grant-join-permission.js --network bsc");
        return;
    }

    console.log("\n🏦 Step 2: Depositing SHIB as collateral...");
    try {
        const joinTx = await shibJoin.join(user.address, depositAmount);
        await joinTx.wait();
        console.log("✅ SHIB deposited as collateral");
    } catch (error) {
        console.log("❌ Join failed:", error.message);
        console.log("This might be due to:");
        console.log("1. Insufficient SHIB balance (but we checked this)");
        console.log("2. Vat permissions not set correctly (but we checked this)");
        console.log("3. SHIB-A ilk not initialized");
        console.log("4. Spot price not set");
        return;
    }

    console.log("\n📊 Step 3: Checking collateral balance in Vat...");
    const [ink, art] = await vat.urns(ethers.encodeBytes32String("SHIB-A"), user.address);
    console.log("🏦 Collateral locked:", ethers.formatEther(ink), "SHIB");
    console.log("🏦 Debt outstanding:", ethers.formatEther(art), "USDog");

    console.log("\n🪙 Step 4: Minting USDog stablecoins...");
    try {
        await vat.frob(
            ethers.encodeBytes32String("SHIB-A"),
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
    const finalShibBalance = await shibToken.balanceOf(user.address);
    const finalUsdogBalance = await stablecoin.balanceOf(user.address);
    const finalUrn = await vat.urns(ethers.encodeBytes32String("SHIB-A"), user.address);

    console.log("🐕 Final SHIB Balance:", ethers.formatEther(finalShibBalance), "SHIB");
    console.log("💵 Final USDog Balance:", ethers.formatEther(finalUsdogBalance), "USDog");
    console.log("🏦 Collateral in CDP:", ethers.formatEther(finalUrn[0]), "SHIB");
    console.log("🏦 Debt in CDP:", ethers.formatEther(finalUrn[1]), "USDog");

    // Calculate collateralization ratio
    if (finalUrn[1] > 0n) {
        const collateralValue = finalUrn[0] * 368934881474n; // Approximate SHIB price
        const collateralizationRatio = (collateralValue * 100n) / (finalUrn[1] * ethers.parseEther("1"));
        console.log("📊 Collateralization Ratio:", collateralizationRatio.toString(), "%");
    }

    console.log("\n🎉 CDP Test completed successfully!");
    console.log("✅ SHIB deposited as collateral");
    console.log("✅ USDog stablecoins minted");
    console.log("✅ System functioning correctly");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error during CDP testing:", error);
        process.exit(1);
    });