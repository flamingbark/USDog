const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Debugging SHIB Token Issues...\n");

    const [user] = await ethers.getSigners();
    console.log("Testing with account:", user.address);

    // Contract addresses
    const addresses = {
        vat: "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be",
        shibJoin: "0x5E03607Ce6ca0382c054e5E978a3d31A57758Df3",
        shibToken: "0x2859e4544c4bb03966803b044a93563bd2d0dd4d"
    };

    // SHIB token contract with extended ABI
    const shibToken = new ethers.Contract(addresses.shibToken, [
        "function balanceOf(address) view returns (uint256)",
        "function approve(address, uint256) returns (bool)",
        "function allowance(address, address) view returns (uint256)",
        "function transfer(address, uint256) returns (bool)",
        "function decimals() view returns (uint8)",
        "function name() view returns (string)",
        "function symbol() view returns (string)"
    ], user);

    console.log("📊 SHIB Token Information:");
    try {
        const name = await shibToken.name();
        const symbol = await shibToken.symbol();
        const decimals = await shibToken.decimals();
        console.log("Name:", name);
        console.log("Symbol:", symbol);
        console.log("Decimals:", decimals);
    } catch (error) {
        console.log("❌ Error getting token info:", error.message);
    }

    console.log("\n📊 Checking balances and allowances:");
    
    // Check SHIB balance
    const shibBalance = await shibToken.balanceOf(user.address);
    console.log("🐕 SHIB Balance:", ethers.formatUnits(shibBalance, 18), "SHIB");

    // Test smaller amount (0.1% instead of 1%)
    const depositAmount = shibBalance / 1000n; // 0.1% of balance
    console.log("📥 Test Deposit Amount:", ethers.formatUnits(depositAmount, 18), "SHIB (0.1% of balance)");

    // Check current allowance
    const currentAllowance = await shibToken.allowance(user.address, addresses.shibJoin);
    console.log("💰 Current allowance:", ethers.formatUnits(currentAllowance, 18), "SHIB");

    console.log("\n🔧 Testing SHIB token operations:");

    // Test direct transfer to self (should work if token is functional)
    try {
        console.log("🔄 Testing self-transfer of 1 SHIB...");
        const tx = await shibToken.transfer(user.address, ethers.parseUnits("1", 18));
        await tx.wait();
        console.log("✅ Self-transfer successful");
    } catch (error) {
        console.log("❌ Self-transfer failed:", error.message);
    }

    // Test approval
    try {
        console.log("🔐 Testing approval...");
        const approveTx = await shibToken.approve(addresses.shibJoin, depositAmount);
        await approveTx.wait();
        console.log("✅ Approval successful");
        
        // Verify allowance
        const newAllowance = await shibToken.allowance(user.address, addresses.shibJoin);
        console.log("💰 New allowance:", ethers.formatUnits(newAllowance, 18), "SHIB");
    } catch (error) {
        console.log("❌ Approval failed:", error.message);
    }

    // Check ShibJoin contract
    try {
        console.log("\n🏦 Checking ShibJoin contract:");
        const shibJoin = await ethers.getContractAt("ShibJoin", addresses.shibJoin);
        
        // Try to call join with very small amount
        console.log("🔄 Testing join with minimal amount...");
        const minAmount = ethers.parseUnits("0.001", 18); // 0.001 SHIB
        
        // Approve minimal amount first
        await shibToken.approve(addresses.shibJoin, minAmount);
        
        // Try the join
        await shibJoin.join(user.address, minAmount);
        console.log("✅ Join successful with minimal amount");
        
    } catch (error) {
        console.log("❌ Join failed:", error.message);
        
        // Check if it's a gas estimation error
        if (error.message.includes("estimateGas")) {
            console.log("💡 This appears to be a gas estimation error");
            console.log("💡 The transaction might revert due to contract logic");
        }
    }

    console.log("\n🎯 Debug complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error during debug:", error);
        process.exit(1);
    });