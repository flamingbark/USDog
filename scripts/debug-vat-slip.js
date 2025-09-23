const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Debugging Vat.slip() Call...\n");

    const [user] = await ethers.getSigners();
    console.log("Testing with account:", user.address);

    // Contract addresses
    const addresses = {
        vat: "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be",
        shibJoin: "0x5E03607Ce6ca0382c054e5E978a3d31A57758Df3"
    };

    // Get contract instances
    const vat = await ethers.getContractAt("Vat", addresses.vat);
    const shibJoin = await ethers.getContractAt("ShibJoin", addresses.shibJoin);

    console.log("🔧 Checking ShibJoin contract state:");
    
    // Check ShibJoin properties
    const live = await shibJoin.live();
    const dec = await shibJoin.dec();
    const ilk = await shibJoin.ilk();
    const vatAddress = await shibJoin.vat();
    
    console.log("ShibJoin live:", live.toString());
    console.log("ShibJoin decimals:", dec.toString());
    console.log("ShibJoin ilk:", ethers.decodeBytes32String(ilk));
    console.log("ShibJoin vat address:", vatAddress);
    console.log("Expected vat address:", addresses.vat);

    console.log("\n🔧 Testing decimal conversion:");
    
    const testAmount = ethers.parseUnits("0.001", 18); // 0.001 SHIB
    console.log("Test amount (raw):", testAmount.toString());
    
    // Simulate the decimal conversion that happens in join()
    const wad18 = testAmount * (10n ** (18n - BigInt(dec.toString())));
    console.log("Converted to WAD:", wad18.toString());
    console.log("WAD in ether format:", ethers.formatEther(wad18));

    console.log("\n🔧 Checking Vat state for SHIB-A:");
    
    const shibIlk = ethers.encodeBytes32String("SHIB-A");
    
    // Check ilk configuration
    const ilkData = await vat.ilks(shibIlk);
    console.log("SHIB-A Art:", ilkData.Art.toString());
    console.log("SHIB-A rate:", ilkData.rate.toString());
    console.log("SHIB-A spot:", ilkData.spot.toString());
    console.log("SHIB-A line:", ilkData.line.toString());
    console.log("SHIB-A dust:", ilkData.dust.toString());

    // Check user's current gem balance
    const currentGem = await vat.gem(shibIlk, user.address);
    console.log("Current user gem balance:", ethers.formatEther(currentGem));

    console.log("\n🔧 Testing direct vat.slip() call:");
    
    try {
        // Try calling slip directly (this should fail if the issue is in slip itself)
        console.log("Attempting direct slip call...");
        
        // We need to call slip from an authorized address (the ShibJoin contract)
        // So we'll test if we can call it from our deployer account
        const tx = await vat.slip(shibIlk, user.address, wad18);
        await tx.wait();
        console.log("✅ Direct slip call successful!");
        
        // Check new balance
        const newGem = await vat.gem(shibIlk, user.address);
        console.log("New gem balance:", ethers.formatEther(newGem));
        
    } catch (error) {
        console.log("❌ Direct slip call failed:", error.message);
        
        if (error.message.includes("not-authorized")) {
            console.log("💡 This is expected - slip requires authorization from ShibJoin");
        }
    }

    console.log("\n🔧 Checking if ShibJoin has Vat authorization:");
    const shibJoinAuth = await vat.wards(addresses.shibJoin);
    console.log("ShibJoin authorized in Vat:", shibJoinAuth.toString());

    console.log("\n🎯 Debug complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error during debug:", error);
        process.exit(1);
    });