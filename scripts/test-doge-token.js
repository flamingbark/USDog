const { ethers } = require("hardhat");

async function main() {
    console.log("🧪 Testing DOGE Token Functionality...\n");

    const [user] = await ethers.getSigners();
    console.log("Testing with account:", user.address);

    const DOGE_TOKEN = "0xba2ae424d960c26247dd6c32edc70b295c744c43";

    // Create token contract instance
    const dogeToken = new ethers.Contract(DOGE_TOKEN, [
        "function balanceOf(address) view returns (uint256)",
        "function transfer(address, uint256) returns (bool)",
        "function approve(address, uint256) returns (bool)",
        "function allowance(address, address) view returns (uint256)",
        "function decimals() view returns (uint8)",
        "function symbol() view returns (string)",
        "function name() view returns (string)"
    ], user);

    console.log("🔍 Testing DOGE token basic functionality...");

    try {
        // Check token info
        const name = await dogeToken.name();
        const symbol = await dogeToken.symbol();
        const decimals = await dogeToken.decimals();

        console.log("Token Name:", name);
        console.log("Token Symbol:", symbol);
        console.log("Token Decimals:", decimals);

        // Check balance
        const balance = await dogeToken.balanceOf(user.address);
        console.log("User Balance:", ethers.formatUnits(balance, decimals), symbol);

        // Test a small transfer to self (should succeed)
        console.log("\n🔄 Testing token transfer...");
        const transferAmount = ethers.parseUnits("0.000001", decimals);
        const transferTx = await dogeToken.transfer(user.address, transferAmount);
        await transferTx.wait();
        console.log("✅ Small transfer successful");

        // Check balance after transfer
        const balanceAfter = await dogeToken.balanceOf(user.address);
        console.log("Balance after transfer:", ethers.formatUnits(balanceAfter, decimals), symbol);

        // Test approval
        console.log("\n🔐 Testing token approval...");
        const approveAmount = ethers.parseUnits("1", decimals);
        const approveTx = await dogeToken.approve(user.address, approveAmount);
        await approveTx.wait();
        console.log("✅ Approval successful");

        // Check allowance
        const allowance = await dogeToken.allowance(user.address, user.address);
        console.log("Allowance:", ethers.formatUnits(allowance, decimals), symbol);

        console.log("\n🎉 DOGE token functionality test passed!");

    } catch (error) {
        console.log("❌ DOGE token test failed:", error.message);
        console.log("This suggests the DOGE token contract may not be a standard ERC-20 token.");
        console.log("Possible issues:");
        console.log("1. Wrong contract address");
        console.log("2. Contract doesn't implement ERC-20 properly");
        console.log("3. Contract is paused or has transfer restrictions");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error testing DOGE token:", error);
        process.exit(1);
    });