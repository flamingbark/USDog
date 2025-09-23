const { ethers } = require("hardhat");

async function main() {
    console.log("🐕 Testing SHIB Collateral Deposit...\n");

    const [user] = await ethers.getSigners();
    console.log("Testing with account:", user.address);

    // Contract addresses
    const addresses = {
        vat: "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be",
        shibJoin: "0x5E03607Ce6ca0382c054e5E978a3d31A57758Df3",
        shibToken: "0x2859e4544c4bb03966803b044a93563bd2d0dd4d"
    };

    // Get contract instances
    const vat = await ethers.getContractAt("Vat", addresses.vat);
    const shibJoin = await ethers.getContractAt("ShibJoin", addresses.shibJoin);

    // SHIB token contract
    const shibToken = new ethers.Contract(addresses.shibToken, [
        "function balanceOf(address) view returns (uint256)",
        "function approve(address, uint256) returns (bool)"
    ], user);

    console.log("📊 Checking SHIB balance...");

    // Check SHIB balance
    const shibBalance = await shibToken.balanceOf(user.address);
    console.log("🐕 SHIB Balance:", ethers.formatUnits(shibBalance, 18), "SHIB");

    // Deposit 1% of SHIB balance (small test amount)
    const depositAmount = shibBalance / 100n; // 1% of balance
    console.log("📥 Deposit Amount:", ethers.formatUnits(depositAmount, 18), "SHIB (1% of balance)");

    console.log("\n🔐 Approving SHIB for ShibJoin...");
    await shibToken.approve(addresses.shibJoin, depositAmount);
    console.log("✅ SHIB approved");

    console.log("\n🏦 Depositing SHIB as collateral...");
    await shibJoin.join(user.address, depositAmount);
    console.log("✅ SHIB deposited");

    // Check SHIB gem balance
    const shibIlk = ethers.encodeBytes32String("SHIB-A");
    const shibGemBalance = await vat.gem(shibIlk, user.address);
    console.log("💰 SHIB gem balance:", ethers.formatEther(shibGemBalance), "WAD");

    // Check final SHIB balance
    const finalShibBalance = await shibToken.balanceOf(user.address);
    console.log("🐕 Final SHIB Balance:", ethers.formatUnits(finalShibBalance, 18), "SHIB");

    console.log("\n✅ SHIB collateral deposit test completed successfully!");
    console.log("✅ SHIB tokens deposited and tracked in Vat");
    console.log("✅ Ready for locking and minting USDog against SHIB collateral");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error during SHIB deposit test:", error);
        process.exit(1);
    });