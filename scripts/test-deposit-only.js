const { ethers } = require("hardhat");

async function main() {
    console.log("🏦 Deposit DOGE as Collateral Test...\n");

    const [user] = await ethers.getSigners();
    console.log("Testing with account:", user.address);

    // Contract addresses
    const addresses = {
        vat: "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be",
        dogeJoin: "0x9d57797222EE904d213E7637E429d10C8ea7125d"
    };

    const DOGE_TOKEN = "0xba2ae424d960c26247dd6c32edc70b295c744c43";

    // Get contract instances
    const vat = await ethers.getContractAt("Vat", addresses.vat);
    const dogeJoin = await ethers.getContractAt("DogeJoin", addresses.dogeJoin);
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

    // Deposit amount: 1 DOGE
    const depositAmount = ethers.parseUnits("1", 8); // 1 DOGE
    console.log("📥 Deposit Amount:", ethers.formatUnits(depositAmount, 8), "DOGE");

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

    // Check Vat gem balance before deposit
    const gemBalanceBefore = await vat.gem(ethers.encodeBytes32String("DOGE-A"), user.address);
    console.log("Vat DOGE gem balance before:", ethers.formatEther(gemBalanceBefore));

    try {
        const joinTx = await dogeJoin.join(user.address, depositAmount);
        await joinTx.wait();
        console.log("✅ DOGE deposited as collateral");
    } catch (error) {
        console.log("❌ Join failed:", error.message);
        console.log("❌ Join failed with reason:", error.reason || "Unknown");
        return;
    }

    // Check Vat gem balance after deposit
    const gemBalanceAfter = await vat.gem(ethers.encodeBytes32String("DOGE-A"), user.address);
    console.log("Vat DOGE gem balance after:", ethers.formatEther(gemBalanceAfter));

    // Check final DOGE balance
    const finalDogeBalance = await dogeToken.balanceOf(user.address);
    console.log("🐕 Final DOGE Balance:", ethers.formatUnits(finalDogeBalance, 8), "DOGE");

    console.log("\n🎉 Deposit test completed successfully!");
    console.log("✅ DOGE deposited as collateral");
    console.log("✅ Vat gem balance increased by:", ethers.formatEther(gemBalanceAfter - gemBalanceBefore));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error during deposit test:", error);
        process.exit(1);
    });