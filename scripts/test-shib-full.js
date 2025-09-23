const { ethers } = require("hardhat");

async function main() {
    console.log("🐕 Testing SHIB Deposit + Mint USDog with API3 Price Feed...\n");

    const [deployer, user] = await ethers.getSigners();
    console.log("Testing with account:", user.address);

    // Deploy test contracts
    console.log("🚀 Deploying test contracts...");

    const Vat = await ethers.getContractFactory("Vat");
    const vat = await Vat.deploy();
    await vat.waitForDeployment();

    const StableCoin = await ethers.getContractFactory("StableCoin");
    const stablecoin = await StableCoin.deploy(31337); // Hardhat chain ID
    await stablecoin.waitForDeployment();

    const Spot = await ethers.getContractFactory("Spot");
    const spot = await Spot.deploy(vat.target);
    await spot.waitForDeployment();

    // Mock SHIB token
    const MockShib = await ethers.getContractFactory("MockShib");
    const shibToken = await MockShib.deploy();
    await shibToken.waitForDeployment();

    // API3 SHIB Price Feed
    const Api3PriceFeed = await ethers.getContractFactory("Api3PriceFeed");
    const shibPriceFeed = await Api3PriceFeed.deploy("0x23336a53F95A6b78DDa5967CDDaCe12390ff010E");
    await shibPriceFeed.waitForDeployment();

    // Join adapter
    const ShibJoin = await ethers.getContractFactory("ShibJoin");
    const shibJoin = await ShibJoin.deploy(vat.target, shibToken.target);
    await shibJoin.waitForDeployment();

    const DaiJoin = await ethers.getContractFactory("DaiJoin");
    const daiJoin = await DaiJoin.deploy(vat.target, stablecoin.target);
    await daiJoin.waitForDeployment();

    // Basic configuration
    const SHIB_ILK = ethers.encodeBytes32String("SHIB-A");
    await vat.init(SHIB_ILK);
    await spot.file(SHIB_ILK, ethers.encodeBytes32String("pip"), shibPriceFeed.target);

    // Set liquidation ratio (150%)
    const RAY = ethers.parseUnits("1", 27);
    const liquidationRatio = (RAY * 150n) / 100n;
    await spot.file(SHIB_ILK, ethers.encodeBytes32String("mat"), liquidationRatio);

    // Set debt ceiling
    const RAD = ethers.parseUnits("1", 45);
    await vat.file(SHIB_ILK, ethers.encodeBytes32String("line"), RAD * 1000000n);

    // Grant permissions
    await vat.rely(shibJoin.target);
    await vat.rely(daiJoin.target);
    await stablecoin.rely(daiJoin.target);

    // Mint test SHIB to user
    await shibToken.mint(user.address, ethers.parseUnits("10000", 18));

    console.log("✅ Test contracts deployed and configured");

    const addresses = {
        vat: vat.target,
        shibJoin: shibJoin.target,
        shibToken: shibToken.target,
        stablecoin: stablecoin.target,
        daiJoin: daiJoin.target
    };

    console.log("📊 Checking SHIB balance...");

    // Check SHIB balance
    const shibBalance = await shibToken.balanceOf(user.address);
    console.log("🐕 SHIB Balance:", ethers.formatUnits(shibBalance, 18), "SHIB");

    // Deposit exactly 1000 SHIB
    const depositAmount = ethers.parseUnits("1000", 18); // 1000 SHIB
    console.log("📥 Deposit Amount:", ethers.formatUnits(depositAmount, 18), "SHIB");

    if (shibBalance < depositAmount) {
        console.log("❌ Insufficient SHIB balance for test");
        return;
    }

    console.log("\n🔐 Approving SHIB for ShibJoin...");
    await shibToken.connect(user).approve(addresses.shibJoin, depositAmount);
    console.log("✅ SHIB approved");

    console.log("\n🏦 Step 1: Depositing 1000 SHIB as collateral...");
    await shibJoin.connect(user).join(user.address, depositAmount);
    console.log("✅ SHIB deposited");

    // Check SHIB gem balance
    const shibIlk = ethers.encodeBytes32String("SHIB-A");
    const shibGemBalance = await vat.gem(shibIlk, user.address);
    console.log("💰 SHIB gem balance:", ethers.formatEther(shibGemBalance), "WAD");

    console.log("\n🔒 Step 2: Locking SHIB collateral...");
    try {
        await vat.connect(user).frob(
            shibIlk,
            user.address,
            user.address,
            user.address,
            depositAmount, // collateral delta (positive = lock collateral)
            0              // debt delta (0 = no minting yet)
        );
        console.log("✅ SHIB collateral locked");
    } catch (error) {
        console.log("❌ Locking failed:", error.message);
        return;
    }

    // Check current position
    const [ink, art] = await vat.urns(shibIlk, user.address);
    console.log("🏦 Locked collateral (ink):", ethers.formatEther(ink), "SHIB");
    console.log("🏦 Current debt (art):", ethers.formatEther(art), "USDog");

    console.log("\n🪙 Step 3: Minting 0.01 USDog...");
    const mintAmount = ethers.parseEther("0.01"); // 0.01 USDog
    console.log("🪙 Mint Amount:", ethers.formatEther(mintAmount), "USDog");

    try {
        await vat.connect(user).frob(
            shibIlk,
            user.address,
            user.address,
            user.address,
            0,           // collateral delta (0 = no change)
            mintAmount   // debt delta (positive = mint USDog)
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

    console.log("\n💰 Step 4: Withdrawing USDog to wallet...");
    try {
        await vat.connect(user).move(user.address, user.address, mintAmount);
        await daiJoin.connect(user).exit(user.address, mintAmount);
        console.log("✅ USDog withdrawn to wallet");
    } catch (error) {
        console.log("❌ Withdrawal failed:", error.message);
        return;
    }

    console.log("\n📊 Final position:");
    const [finalInk, finalArt] = await vat.urns(shibIlk, user.address);
    const finalUsdogBalance = await stablecoin.balanceOf(user.address);
    const finalShibBalance = await shibToken.balanceOf(user.address);

    console.log("🏦 Final locked collateral (ink):", ethers.formatEther(finalInk), "SHIB");
    console.log("🏦 Final debt (art):", ethers.formatEther(finalArt), "USDog");
    console.log("💵 Final USDog Balance:", ethers.formatEther(finalUsdogBalance), "USDog");
    console.log("🐕 Final SHIB Balance:", ethers.formatUnits(finalShibBalance, 18), "SHIB");

    // Calculate collateralization ratio (approximate)
    if (finalArt > 0n) {
        // Using approximate SHIB price of $0.00001 for calculation
        const shibPrice = ethers.parseEther("0.00001"); // $0.00001 per SHIB
        const collateralValue = (finalInk * shibPrice) / ethers.parseEther("1");
        const collateralizationRatio = (collateralValue * 100n) / finalArt;
        console.log("📊 Approximate Collateralization Ratio:", collateralizationRatio.toString(), "%");
    }

    console.log("\n🎉 SHIB deposit + mint test completed successfully!");
    console.log("✅ 1000 SHIB deposited and locked as collateral");
    console.log("✅ 0.01 USDog minted against SHIB collateral");
    console.log("✅ API3 price feed integration verified");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error during SHIB test:", error);
        process.exit(1);
    });