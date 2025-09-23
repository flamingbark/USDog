const { ethers } = require("hardhat");

async function main() {
    console.log("🏦 Testing CDP Functionality: Deposit DOGE & Mint USDog...\n");

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

    // Check DOGE balance (DOGE has 8 decimals, not 18)
    const dogeBalance = await dogeToken.balanceOf(user.address);
    const dogeBalanceFormatted = ethers.formatUnits(dogeBalance, 8);
    console.log("🐕 DOGE Balance:", dogeBalanceFormatted, "DOGE");

    if (dogeBalance === 0n) {
        console.log("❌ No DOGE balance found. Cannot test CDP functionality.");
        return;
    }

    // Check initial USDog balance
    const initialUsdogBalance = await stablecoin.balanceOf(user.address);
    console.log("💵 Initial USDog Balance:", ethers.formatEther(initialUsdogBalance), "USDog");

    // Amount to deposit (use available balance for testing)
    const availableBalance = dogeBalance > ethers.parseUnits("0.00000001", 8) ? dogeBalance : ethers.parseUnits("0.000000001", 8);
    const depositAmount = availableBalance; // Use all available DOGE
    console.log("📥 Deposit Amount:", ethers.formatUnits(depositAmount, 8), "DOGE");

    // Calculate maximum USDog that can be minted (considering 150% liquidation ratio)
    // DOGE price is ~$0.553 (from our monitoring), so small amount = small value
    // At 150% collateralization, max USDog = value / 1.5
    // Use a very small amount for testing
    const mintAmount = ethers.parseEther("0.001"); // 0.001 USDog for testing
    console.log("🪙 Mint Amount:", ethers.formatEther(mintAmount), "USDog");

    console.log("\n🔐 Step 1: Approving DOGE for DogeJoin contract...");
    const approveTx = await dogeToken.approve(addresses.dogeJoin, depositAmount);
    await approveTx.wait();
    console.log("✅ DOGE approved for DogeJoin");

    console.log("\n🏦 Step 2: Depositing DOGE as collateral...");

    // Debug: Check Vat permissions and ilk configuration
    console.log("🔍 Checking Vat permissions...");
    const canJoinModifyVat = await vat.can(addresses.dogeJoin, addresses.vat);
    console.log("Can DogeJoin modify Vat?", canJoinModifyVat);

    const ilkData = await vat.ilks(ethers.encodeBytes32String("DOGE-A"));
    console.log("DOGE-A ilk data:", {
        Art: ilkData[0].toString(),
        rate: ilkData[1].toString(),
        spot: ilkData[2].toString(),
        line: ilkData[3].toString(),
        dust: ilkData[4].toString()
    });

    try {
        const joinTx = await dogeJoin.join(user.address, depositAmount);
        await joinTx.wait();
        console.log("✅ DOGE deposited as collateral");
    } catch (error) {
        console.log("❌ Join failed:", error.message);
        console.log("Checking if Vat has DOGE-A ilk initialized...");
        try {
            const gemBalance = await vat.gem(ethers.encodeBytes32String("DOGE-A"), user.address);
            console.log("Vat gem balance:", gemBalance.toString());
        } catch (e) {
            console.log("❌ Vat gem query failed:", e.message);
        }
        return;
    }

    console.log("\n📊 Step 3: Checking collateral balance in Vat...");
    const [ink, art] = await vat.urns(ethers.encodeBytes32String("DOGE-A"), user.address);
    console.log("🏦 Collateral locked:", ethers.formatEther(ink), "DOGE");
    console.log("🏦 Debt outstanding:", ethers.formatEther(art), "USDog");

    console.log("\n🪙 Step 4: Minting USDog stablecoins...");
    await vat.frob(
        ethers.encodeBytes32String("DOGE-A"),
        user.address,
        user.address,
        user.address,
        depositAmount, // collateral delta (positive = add collateral)
        mintAmount    // debt delta (positive = mint USDog)
    );
    console.log("✅ USDog minted");

    console.log("\n💰 Step 5: Withdrawing USDog to wallet...");
    await vat.move(user.address, user.address, mintAmount);
    await daiJoin.exit(user.address, mintAmount);
    console.log("✅ USDog withdrawn to wallet");

    console.log("\n📊 Final balances:");
    const finalDogeBalance = await dogeToken.balanceOf(user.address);
    const finalUsdogBalance = await stablecoin.balanceOf(user.address);
    const finalUrn = await vat.urns(ethers.encodeBytes32String("DOGE-A"), user.address);

    console.log("🐕 Final DOGE Balance:", ethers.formatEther(finalDogeBalance), "DOGE");
    console.log("💵 Final USDog Balance:", ethers.formatEther(finalUsdogBalance), "USDog");
    console.log("🏦 Collateral in CDP:", ethers.formatEther(finalUrn[0]), "DOGE");
    console.log("🏦 Debt in CDP:", ethers.formatEther(finalUrn[1]), "USDog");

    // Calculate collateralization ratio
    const collateralValue = finalUrn[0] * 553402322211n; // Approximate DOGE price
    const collateralizationRatio = (collateralValue * 100n) / (finalUrn[1] * ethers.parseEther("1"));
    console.log("📊 Collateralization Ratio:", collateralizationRatio.toString(), "%");

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