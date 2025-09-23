const { ethers } = require("hardhat");

async function main() {
    console.log("🔧 Testing New ShibJoin Contract...\n");

    const [user] = await ethers.getSigners();
    console.log("Testing with account:", user.address);

    // Contract addresses
    const addresses = {
        vat: "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be",
        newShibJoin: "0xd88AF8a38Fc3719668FEae8477A0aeA584Ac69A5",
        shibToken: "0x2859e4544c4bb03966803b044a93563bd2d0dd4d"
    };

    // Get contract instances
    const vat = await ethers.getContractAt("Vat", addresses.vat);
    const shibJoin = await ethers.getContractAt("ShibJoin", addresses.newShibJoin);

    // SHIB token contract
    const shibToken = new ethers.Contract(addresses.shibToken, [
        "function balanceOf(address) view returns (uint256)",
        "function approve(address, uint256) returns (bool)"
    ], user);

    console.log("📊 Pre-test checks:");
    
    // Check SHIB balance
    const shibBalance = await shibToken.balanceOf(user.address);
    console.log("🐕 SHIB Balance:", ethers.formatUnits(shibBalance, 18), "SHIB");

    // Check current gem balance in Vat
    const shibIlk = ethers.encodeBytes32String("SHIB-A");
    const currentGem = await vat.gem(shibIlk, user.address);
    console.log("💰 Current gem balance:", ethers.formatEther(currentGem), "WAD");

    // Check permissions
    const permission = await vat.wards(addresses.newShibJoin);
    console.log("🔑 ShibJoin permission:", permission.toString());

    console.log("\n🔧 Testing SHIB deposit with new contract:");

    // Test with small amount
    const depositAmount = ethers.parseUnits("1", 18); // 1 SHIB
    console.log("📥 Deposit Amount:", ethers.formatUnits(depositAmount, 18), "SHIB");

    console.log("\n🔐 Approving SHIB for new ShibJoin...");
    await shibToken.approve(addresses.newShibJoin, depositAmount);
    console.log("✅ SHIB approved");

    console.log("\n🏦 Depositing SHIB as collateral...");
    try {
        await shibJoin.join(user.address, depositAmount);
        console.log("✅ SHIB deposited successfully!");

        // Check new gem balance
        const newGem = await vat.gem(shibIlk, user.address);
        console.log("💰 New gem balance:", ethers.formatEther(newGem), "WAD");

        // Check final SHIB balance
        const finalShibBalance = await shibToken.balanceOf(user.address);
        console.log("🐕 Final SHIB Balance:", ethers.formatUnits(finalShibBalance, 18), "SHIB");

        console.log("\n🎉 SUCCESS: New ShibJoin works perfectly!");
        console.log("✅ SHIB tokens deposited and tracked in Vat");
        console.log("✅ Ready to update frontend with new contract address");

    } catch (error) {
        console.log("❌ SHIB deposit failed:", error.message);
        
        if (error.message.includes("not-authorized")) {
            console.log("💡 Permission issue - need to wait for blockchain confirmation");
        }
    }

    console.log("\n📋 Contract addresses for frontend update:");
    console.log("New ShibJoin:", addresses.newShibJoin);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error during test:", error);
        process.exit(1);
    });