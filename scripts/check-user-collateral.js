const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Checking User Collateral Balance...\n");

    // You'll need to replace this with your actual wallet address
    const userAddress = "0x3263343c30107ec252C88C2718a1512089845D07"; // Replace with your wallet address
    
    const addresses = {
        vat: "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be",
        shibJoin: "0xd88AF8a38Fc3719668FEae8477A0aeA584Ac69A5",
        shibToken: "0x2859e4544c4bb03966803b044a93563bd2d0dd4d"
    };

    // Get contract instances
    const vat = await ethers.getContractAt("Vat", addresses.vat);
    const shibToken = new ethers.Contract(addresses.shibToken, [
        "function balanceOf(address) view returns (uint256)"
    ], ethers.provider);

    console.log("📊 Checking balances for:", userAddress);
    console.log("Using SHIB token:", addresses.shibToken);
    console.log("Using new ShibJoin:", addresses.shibJoin);

    // Check SHIB token balance
    const shibBalance = await shibToken.balanceOf(userAddress);
    console.log("🐕 SHIB Token Balance:", ethers.formatUnits(shibBalance, 18), "SHIB");

    // Check SHIB collateral in Vat (gem balance)
    const shibIlk = ethers.encodeBytes32String("SHIB-A");
    const gemBalance = await vat.gem(shibIlk, userAddress);
    console.log("💰 SHIB Gem Balance (Vat):", ethers.formatEther(gemBalance), "WAD");

    // Check CDP (urn) info
    const urn = await vat.urns(shibIlk, userAddress);
    console.log("🏦 CDP Info:");
    console.log("  Locked collateral (ink):", ethers.formatEther(urn.ink), "WAD");
    console.log("  Debt (art):", ethers.formatEther(urn.art), "WAD");

    // Explain the values
    console.log("\n📋 Explanation:");
    console.log("- SHIB Token Balance: Your wallet's SHIB tokens");
    console.log("- SHIB Gem Balance: Deposited SHIB in Vat (available to lock)");
    console.log("- Locked collateral: SHIB locked as collateral for loans");
    console.log("- Debt: Amount of USDog borrowed against collateral");

    // Check if deposit was successful
    if (gemBalance > 0) {
        console.log("\n✅ SUCCESS: SHIB deposit detected in Vat!");
        console.log("💡 Frontend might need a refresh or have caching issues");
    } else {
        console.log("\n❌ No SHIB collateral found in Vat");
        console.log("💡 The deposit transaction might have failed");
    }

    console.log("\n🎯 Debug complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error checking collateral:", error);
        process.exit(1);
    });