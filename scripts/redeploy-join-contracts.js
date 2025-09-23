const { ethers } = require("hardhat");

async function main() {
    console.log("🔧 Redeploying Join Contracts...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    // Contract addresses
    const addresses = {
        vat: "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be",
        shibToken: "0x2859e4544c4bb03966803b044a93563bd2d0dd4d",
        dogeToken: "0xbA2aE424d960c26247Dd6c32edC70B295c744C43"
    };

    console.log("🔧 Deploying new ShibJoin contract...");
    
    // Deploy new ShibJoin
    const ShibJoin = await ethers.getContractFactory("ShibJoin");
    const newShibJoin = await ShibJoin.deploy(addresses.vat, addresses.shibToken);
    await newShibJoin.waitForDeployment();
    
    const newShibJoinAddress = await newShibJoin.getAddress();
    console.log("✅ New ShibJoin deployed at:", newShibJoinAddress);

    // Test the new ShibJoin
    console.log("\n🔧 Testing new ShibJoin...");
    try {
        const live = await newShibJoin.live();
        const dec = await newShibJoin.dec();
        const ilk = await newShibJoin.ilk();
        const vat = await newShibJoin.vat();
        const gem = await newShibJoin.gem();

        console.log("✅ New ShibJoin tests:");
        console.log("  live:", live.toString());
        console.log("  dec:", dec.toString());
        console.log("  ilk:", ethers.decodeBytes32String(ilk));
        console.log("  vat:", vat);
        console.log("  gem:", gem);

        // Test a small join operation
        console.log("\n🔧 Testing join operation with new contract...");
        
        const shibToken = new ethers.Contract(addresses.shibToken, [
            "function approve(address, uint256) returns (bool)",
            "function balanceOf(address) view returns (uint256)"
        ], deployer);

        const balance = await shibToken.balanceOf(deployer.address);
        console.log("SHIB balance:", ethers.formatUnits(balance, 18));

        if (balance > 0) {
            const testAmount = ethers.parseUnits("1", 18); // 1 SHIB
            
            // Approve
            console.log("Approving 1 SHIB...");
            await shibToken.approve(newShibJoinAddress, testAmount);
            console.log("✅ Approved");

            // Try join
            console.log("Attempting join...");
            await newShibJoin.join(deployer.address, testAmount);
            console.log("✅ Join successful!");
        } else {
            console.log("⚠️  No SHIB balance to test join");
        }

    } catch (error) {
        console.log("❌ New ShibJoin test failed:", error.message);
    }

    console.log("\n🔧 Deploying new DogeJoin contract...");
    
    // Deploy new DogeJoin  
    const DogeJoin = await ethers.getContractFactory("DogeJoin");
    const newDogeJoin = await DogeJoin.deploy(addresses.vat, addresses.dogeToken);
    await newDogeJoin.waitForDeployment();
    
    const newDogeJoinAddress = await newDogeJoin.getAddress();
    console.log("✅ New DogeJoin deployed at:", newDogeJoinAddress);

    // Test the new DogeJoin
    console.log("\n🔧 Testing new DogeJoin...");
    try {
        const live = await newDogeJoin.live();
        const dec = await newDogeJoin.dec();
        const ilk = await newDogeJoin.ilk();

        console.log("✅ New DogeJoin tests:");
        console.log("  live:", live.toString());
        console.log("  dec:", dec.toString());
        console.log("  ilk:", ethers.decodeBytes32String(ilk));

    } catch (error) {
        console.log("❌ New DogeJoin test failed:", error.message);
    }

    console.log("\n🎉 New contract addresses:");
    console.log("New ShibJoin:", newShibJoinAddress);
    console.log("New DogeJoin:", newDogeJoinAddress);
    console.log("\n💡 Next steps:");
    console.log("1. Grant permissions: vat.rely(newShibJoinAddress)");
    console.log("2. Grant permissions: vat.rely(newDogeJoinAddress)"); 
    console.log("3. Update frontend contract addresses");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error during redeployment:", error);
        process.exit(1);
    });