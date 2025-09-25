const { ethers } = require("hardhat");

/**
 * Flash Liquidation Test Script
 *
 * This script tests the complete flash liquidation flow:
 * 1. Deploys test vault with DOGE/SHIB collateral
 * 2. Creates unsafe position (optional force mode)
 * 3. Triggers flash liquidation via FlashLiquidator contract
 * 4. Verifies profit and system state
 *
 * Usage:
 *   COLLATERAL=DOGE AMOUNT=1000 FORCE=1 npx hardhat run scripts/test-flash-liquidation.js --network bsc
 */

async function main() {
  const [signer] = await ethers.getSigners();

  // Environment variables
  const COLLATERAL = process.env.COLLATERAL || "SHIB"; // DOGE or SHIB
  const AMOUNT = process.env.AMOUNT || "1000"; // Collateral amount to deposit
  const FORCE = process.env.FORCE === "1"; // Force unsafe position
  const LIQUIDATOR_ADDRESS = process.env.FLASH_LIQUIDATOR || ""; // FlashLiquidator contract address

  if (!LIQUIDATOR_ADDRESS) {
    console.log("❌ Please set FLASH_LIQUIDATOR environment variable to the deployed FlashLiquidator address");
    console.log("Run deploy-flash-liquidator.js first, then use the deployed address");
    process.exit(1);
  }

  console.log(`🧪 Testing flash liquidation for ${COLLATERAL} collateral`);
  console.log(`💰 Collateral amount: ${AMOUNT}`);
  console.log(`⚡ Force unsafe: ${FORCE}`);

  // Contract addresses
  const addresses = {
    vat: "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be",
    spot: "0x5f029d9b48162a809919e595c2b712f5cb039d19",
    dog: "0x8F8f0E79cE4AAaC0E19826C3F730DC82B107AB88",
    daiJoin: "0xEae2f180ad117A407A595D31782e66D0dA727967",
    stablecoin: "0xb1abd2a64b829596d7afefca31a6c984b5afaafb",
    flashLiquidator: LIQUIDATOR_ADDRESS,
  };

  // Token addresses and configurations
  const tokens = {
    DOGE: {
      address: "0xbA2aE424d960c26247Dd6c32edC70B295c744C43",
      join: "0x0000000000000000000000000000000000000000", // Update with actual join
      ilk: "DOGE-A",
      decimals: 8
    },
    SHIB: {
      address: "0x2859e4544C4bB03966803b044A93563Bd2D0DD4D",
      join: "0x0000000000000000000000000000000000000000", // Update with actual join
      ilk: "SHIB-A",
      decimals: 18
    }
  };

  const token = tokens[COLLATERAL];
  if (!token) {
    console.log("❌ Unsupported collateral type. Use DOGE or SHIB");
    process.exit(1);
  }

  const ILK = ethers.encodeBytes32String(token.ilk);

  // Initialize contracts
  const vat = await ethers.getContractAt("Vat", addresses.vat, signer);
  const dog = await ethers.getContractAt("Dog", addresses.dog, signer);
  const spot = await ethers.getContractAt("Spot", addresses.spot, signer);
  const flashLiquidator = await ethers.getContractAt("FlashLiquidator", addresses.flashLiquidator, signer);
  const collateralToken = await ethers.getContractAt("IERC20", token.address, signer);

  console.log("📋 Contracts initialized");

  // Step 1: Create a test position (if needed)
  console.log("\n🏗️ Step 1: Setting up test position...");

  const userAddress = signer.address;
  const collateralAmount = ethers.parseUnits(AMOUNT, token.decimals);

  // Check if user already has a position
  const urn = await vat.urns(ILK, userAddress);
  const existingInk = BigInt(urn[0].toString());
  const existingArt = BigInt(urn[1].toString());

  console.log(`Current position - ink: ${existingInk}, art: ${existingArt}`);

  // Step 2: Check if position is unsafe
  console.log("\n🔍 Step 2: Checking position safety...");

  const ilkData = await vat.ilks(ILK);
  const rate = BigInt(ilkData[1].toString());
  const spotVal = BigInt(ilkData[2].toString());

  const lhs = existingInk * spotVal;
  const rhs = existingArt * rate;
  const isUnsafe = lhs < rhs;

  console.log(`Safety check: ink*spot (${lhs}) < art*rate (${rhs}) = ${isUnsafe}`);

  if (!isUnsafe && FORCE) {
    console.log("\n⚠️ Position is safe, forcing unsafe by adjusting price...");

    try {
      // Increase collateral ratio to make position unsafe
      const RAY = 10n ** 27n;
      const newMat = RAY * 5n; // 500% ratio

      const tx1 = await spot["file(bytes32,bytes32,uint256)"](ILK, ethers.encodeBytes32String("mat"), newMat);
      await tx1.wait();
      console.log("✅ Updated mat to 500%");

      const tx2 = await spot.poke(ILK);
      await tx2.wait();
      console.log("✅ Poked spot to update price");

      // Recheck safety
      const ilkData2 = await vat.ilks(ILK);
      const spot2 = BigInt(ilkData2[2].toString());
      const lhs2 = existingInk * spot2;
      const isUnsafe2 = lhs2 < rhs;
      console.log(`After forcing: unsafe = ${isUnsafe2}`);

    } catch (e) {
      console.log("❌ Failed to force unsafe position:", e.message);
      console.log("You may need admin permissions or create an actually unsafe position");
    }
  }

  if (existingArt === 0n) {
    console.log("❌ No debt position found. Create a CDP first before testing liquidation");
    return;
  }

  // Step 3: Estimate liquidation profit
  console.log("\n💰 Step 3: Estimating liquidation profit...");

  try {
    const [estimatedProfit, isViable] = await flashLiquidator.estimateLiquidationProfit(
      userAddress,
      "0x0000000000000000000000000000000000000000", // Not used in current implementation
      "0x0000000000000000000000000000000000000000", // Not used in current implementation
      existingArt * rate / 2n // Liquidate half the debt
    );

    console.log(`Estimated profit: ${ethers.formatEther(estimatedProfit)} DAI`);
    console.log(`Is viable: ${isViable}`);

    if (!isViable) {
      console.log("⚠️ Liquidation may not be profitable, continuing anyway...");
    }
  } catch (e) {
    console.log("⚠️ Could not estimate profit:", e.message);
  }

  // Step 4: Execute flash liquidation
  console.log("\n🚀 Step 4: Executing flash liquidation...");

  // For this test, we'll use a placeholder flash loan pool
  // In practice, you'd use a real PancakeSwap pair address
  const flashLoanPools = {
    "DOGE-WBNB": "0x0000000000000000000000000000000000000001",
    "SHIB-WBNB": "0x0000000000000000000000000000000000000002",
    "WBNB-DAI": "0x36696169C63e42cd08ce11f5deeBbCeBae652050" // Real WBNB-BUSD pair as fallback
  };

  const flashLoanPool = flashLoanPools[`${COLLATERAL}-WBNB`] || flashLoanPools["WBNB-DAI"];

  console.log(`Using flash loan pool: ${flashLoanPool}`);

  try {
    // Record balances before liquidation
    const initialDAIBalance = await ethers.provider.getBalance(signer.address);
    const initialCollateralBalance = await collateralToken.balanceOf(signer.address);

    console.log("Calling liquidateMemeCollateral...");

    const tx = await flashLiquidator.liquidateMemeCollateral(
      userAddress,
      "0x0000000000000000000000000000000000000000", // collateralVToken (not used)
      "0x0000000000000000000000000000000000000000", // debtVToken (not used)
      existingArt * rate / 2n, // repayAmount - liquidate half
      flashLoanPool,
      {
        gasLimit: 2000000, // High gas limit for complex operation
        gasPrice: ethers.parseUnits("25", "gwei")
      }
    );

    console.log(`Transaction hash: ${tx.hash}`);
    const receipt = await tx.wait();

    if (receipt.status === 1) {
      console.log("✅ Flash liquidation successful!");

      // Check final balances
      const finalDAIBalance = await ethers.provider.getBalance(signer.address);
      const finalCollateralBalance = await collateralToken.balanceOf(signer.address);

      const profitDAI = finalDAIBalance - initialDAIBalance;
      const profitCollateral = finalCollateralBalance - initialCollateralBalance;

      console.log(`💰 Profit in BNB: ${ethers.formatEther(profitDAI)}`);
      console.log(`💰 Profit in ${COLLATERAL}: ${ethers.formatUnits(profitCollateral, token.decimals)}`);

      // Parse events for detailed information
      const events = receipt.logs;
      console.log(`📄 Transaction events: ${events.length}`);

    } else {
      console.log("❌ Flash liquidation failed");
    }

  } catch (e) {
    console.error("❌ Flash liquidation error:", e.message);

    if (e.message.includes("not-unsafe")) {
      console.log("💡 Position is not unsafe for liquidation");
    } else if (e.message.includes("insufficient")) {
      console.log("💡 Insufficient funds or allowances");
    } else if (e.message.includes("invalid-pair")) {
      console.log("💡 Invalid flash loan pool - check PancakeSwap pair address");
    }
  }

  // Step 5: Final system state
  console.log("\n📊 Step 5: Final system state...");

  const finalUrn = await vat.urns(ILK, userAddress);
  const finalInk = BigInt(finalUrn[0].toString());
  const finalArt = BigInt(finalUrn[1].toString());

  console.log(`Final position - ink: ${finalInk}, art: ${finalArt}`);
  console.log(`Position change - ink: ${finalInk - existingInk}, art: ${finalArt - existingArt}`);

  console.log("\n✅ Flash liquidation test completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });