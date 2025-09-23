const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Checking ShibJoin Deployment...\n");

    const [user] = await ethers.getSigners();
    console.log("Checking with account:", user.address);

    const addresses = {
        vat: "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be",
        shibJoin: "0x5E03607Ce6ca0382c054e5E978a3d31A57758Df3",
        dogeJoin: "0x09FA30f1397c9d208C3c7e7A99Ca7B4d274141c7",
        shibToken: "0x2859e4544c4bb03966803b044a93563bd2d0dd4d"
    };

    console.log("🔧 Checking contract deployments:");

    // Check if contracts have code deployed
    for (const [name, address] of Object.entries(addresses)) {
        try {
            const code = await ethers.provider.getCode(address);
            const hasCode = code !== "0x";
            console.log(`${name} (${address}): ${hasCode ? "✅ Deployed" : "❌ No Code"}`);
        } catch (error) {
            console.log(`${name} (${address}): ❌ Error checking - ${error.message}`);
        }
    }

    console.log("\n🔧 Testing DogeJoin vs ShibJoin:");

    // Test DogeJoin (which works)
    try {
        console.log("Testing DogeJoin...");
        const dogeJoin = await ethers.getContractAt("DogeJoin", addresses.dogeJoin);
        const dogeLive = await dogeJoin.live();
        const dogeDec = await dogeJoin.dec();
        console.log("✅ DogeJoin works - live:", dogeLive.toString(), "dec:", dogeDec.toString());
    } catch (error) {
        console.log("❌ DogeJoin failed:", error.message);
    }

    // Test ShibJoin (which fails)
    try {
        console.log("Testing ShibJoin...");
        const shibJoin = await ethers.getContractAt("ShibJoin", addresses.shibJoin);
        const shibLive = await shibJoin.live();
        console.log("✅ ShibJoin live check passed:", shibLive.toString());
        
        const shibDec = await shibJoin.dec();
        console.log("✅ ShibJoin dec check passed:", shibDec.toString());
    } catch (error) {
        console.log("❌ ShibJoin failed:", error.message);
    }

    console.log("\n🔧 Checking constructor parameters:");

    // Check what the ShibJoin was deployed with
    try {
        // Try to read from the contracts directly with minimal ABI
        const shibJoinMinimal = new ethers.Contract(addresses.shibJoin, [
            "function vat() view returns (address)",
            "function gem() view returns (address)",
            "function ilk() view returns (bytes32)"
        ], ethers.provider);

        const shibVat = await shibJoinMinimal.vat();
        const shibGem = await shibJoinMinimal.gem();
        const shibIlk = await shibJoinMinimal.ilk();

        console.log("ShibJoin vat:", shibVat);
        console.log("ShibJoin gem:", shibGem);
        console.log("ShibJoin ilk:", ethers.decodeBytes32String(shibIlk));
        console.log("Expected SHIB token:", addresses.shibToken);

        if (shibGem.toLowerCase() !== addresses.shibToken.toLowerCase()) {
            console.log("❌ MISMATCH: ShibJoin points to wrong SHIB token!");
        } else {
            console.log("✅ ShibJoin correctly points to SHIB token");
        }

    } catch (error) {
        console.log("❌ Error checking constructor params:", error.message);
    }

    console.log("\n🎯 Deployment check complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error during check:", error);
        process.exit(1);
    });