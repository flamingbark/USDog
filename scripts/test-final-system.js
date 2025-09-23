const { ethers } = require("hardhat");

async function main() {
    console.log("🎯 Final USDog System Test: DOGE & SHIB Collateral...\n");

    const [user] = await ethers.getSigners();
    console.log("Testing with account:", user.address);

    // Contract addresses
    const addresses = {
        vat: "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be",
        dogeJoin: "0x9d57797222EE904d213E7637E429d10C8ea7125d",
        shibJoin: "0x5E03607Ce6ca0382c054e5E978a3d31A57758Df3",
        stablecoin: "0xb1abd2a64b829596d7afefca31a6c984b5afaafb",
        daiJoin: "0xB1780C459493EBA4Cc921A68F19174cc441e96B7",
        spot: "0x5f029d9b48162a809919e595c2b712f5cb039d19",
        dogeToken: "0xba2ae424d960c26247dd6c32edc70b295c744c43",
        shibToken: "0x2859e4544c4bb03966803b044a93563bd2d0dd4d"
    };

    // Get contract instances
    const vat = await ethers.getContractAt("Vat", addresses.vat);
    const dogeJoin = await ethers.getContractAt("DogeJoin", addresses.dogeJoin);
    const shibJoin = await ethers.getContractAt("ShibJoin", addresses.shibJoin);
    const stablecoin = await ethers.getContractAt("StableCoin", addresses.stablecoin);
    const daiJoin = await ethers.getContractAt("DaiJoin", addresses.daiJoin);
    const spot = await ethers.getContractAt("Spot", addresses.spot);

    // Token contracts
    const dogeToken = new ethers.Contract(addresses.dogeToken, [
        "function balanceOf(address) view returns (uint256)",
        "function approve(address, uint256) returns (bool)"
    ], user);

    const shibToken = new ethers.Contract(addresses.shibToken, [
        "function balanceOf(address) view returns (uint256)",
        "function approve(address, uint256) returns (bool)"
    ], user);

    console.log("📊 Checking price feeds...");

    // Check current spot prices
    const dogeIlk = ethers.encodeBytes32String("DOGE-A");
    const shibIlk = ethers.encodeBytes32String("SHIB-A");

    try {
        const dogeSpotData = await spot.ilks(dogeIlk);
        console.log("🐕 DOGE spot price:", dogeSpotData.spot.toString());
    } catch (error) {
        console.log("⚠️ Could not read DOGE spot price");
    }

    try {
        const shibSpotData = await spot.ilks(shibIlk);
        console.log("🐕 SHIB spot price:", shibSpotData.spot.toString());
    } catch (error) {
        console.log("⚠️ Could not read SHIB spot price");
    }

    console.log("\n📊 Checking balances...");

    // Check token balances
    const initialDogeBalance = await dogeToken.balanceOf(user.address);
    const initialShibBalance = await shibToken.balanceOf(user.address);
    console.log("🐕 DOGE Balance:", ethers.formatUnits(initialDogeBalance, 8), "DOGE");
    console.log("🐕 SHIB Balance:", ethers.formatUnits(initialShibBalance, 18), "SHIB");

    // Approve tokens
    console.log("\n🔐 Approving tokens...");
    const maxUint = ethers.MaxUint256;

    await dogeToken.approve(addresses.dogeJoin, maxUint);
    console.log("✅ DOGE approved");

    await shibToken.approve(addresses.shibJoin, maxUint);
    console.log("✅ SHIB approved");

    // Test DOGE collateral
    console.log("\n🐕 Testing DOGE Collateral...");

    const dogeDepositAmount = ethers.parseUnits("1", 8); // 1 DOGE
    console.log("Depositing 1 DOGE...");

    await dogeJoin.join(user.address, dogeDepositAmount);
    console.log("✅ DOGE deposited");

    // Check DOGE gem balance
    const dogeGemBalance = await vat.gem(dogeIlk, user.address);
    console.log("💰 DOGE gem balance:", ethers.formatEther(dogeGemBalance), "WAD");

    // Lock DOGE collateral
    console.log("Locking DOGE collateral...");
    await vat.frob(dogeIlk, user.address, user.address, user.address, dogeGemBalance, 0);
    console.log("✅ DOGE collateral locked");

    // Mint USDog against DOGE
    const dogeMintAmount = ethers.parseEther("0.001");
    console.log("Minting 0.001 USDog against DOGE...");
    await vat.frob(dogeIlk, user.address, user.address, user.address, 0, dogeMintAmount);
    console.log("✅ USDog minted against DOGE");

    // Test SHIB collateral
    console.log("\n🐕 Testing SHIB Collateral...");

    const shibDepositAmount = ethers.parseUnits("1000", 18); // 1000 SHIB
    console.log("Depositing 1000 SHIB...");

    await shibJoin.join(user.address, shibDepositAmount);
    console.log("✅ SHIB deposited");

    // Check SHIB gem balance
    const shibGemBalance = await vat.gem(shibIlk, user.address);
    console.log("💰 SHIB gem balance:", ethers.formatEther(shibGemBalance), "WAD");

    // Lock SHIB collateral
    console.log("Locking SHIB collateral...");
    await vat.frob(shibIlk, user.address, user.address, user.address, shibGemBalance, 0);
    console.log("✅ SHIB collateral locked");

    // Mint USDog against SHIB
    const shibMintAmount = ethers.parseEther("0.001");
    console.log("Minting 0.001 USDog against SHIB...");
    await vat.frob(shibIlk, user.address, user.address, user.address, 0, shibMintAmount);
    console.log("✅ USDog minted against SHIB");

    // Total minted
    const totalMintAmount = dogeMintAmount + shibMintAmount;
    console.log("💰 Total USDog minted:", ethers.formatEther(totalMintAmount), "USDog");

    // Withdraw USDog to wallet
    console.log("\n💰 Withdrawing USDog to wallet...");
    await vat.move(user.address, addresses.daiJoin, totalMintAmount);
    await daiJoin.exit(user.address, totalMintAmount);
    console.log("✅ USDog withdrawn to wallet");

    // Final balances
    console.log("\n📊 Final state:");
    const finalDogeBalance = await dogeToken.balanceOf(user.address);
    const finalShibBalance = await shibToken.balanceOf(user.address);
    const finalUsdogBalance = await stablecoin.balanceOf(user.address);

    console.log("🐕 Final DOGE Balance:", ethers.formatUnits(finalDogeBalance, 8), "DOGE");
    console.log("🐕 Final SHIB Balance:", ethers.formatUnits(finalShibBalance, 18), "SHIB");
    console.log("💵 Final USDog Balance:", ethers.formatEther(finalUsdogBalance), "USDog");

    // Check CDP positions
    const [dogeInk, dogeArt] = await vat.urns(dogeIlk, user.address);
    const [shibInk, shibArt] = await vat.urns(shibIlk, user.address);

    console.log("🏦 DOGE CDP - Collateral:", ethers.formatEther(dogeInk), "DOGE, Debt:", ethers.formatEther(dogeArt), "USDog");
    console.log("🏦 SHIB CDP - Collateral:", ethers.formatEther(shibInk), "SHIB, Debt:", ethers.formatEther(shibArt), "USDog");

    console.log("\n🎉 Final system test completed successfully!");
    console.log("✅ DOGE collateral deposited, locked, and used to mint USDog");
    console.log("✅ SHIB collateral deposited, locked, and used to mint USDog");
    console.log("✅ USDog withdrawn to wallet");
    console.log("✅ Both DOGE and SHIB work as collateral!");
    console.log("🚀 USDog stablecoin system is fully operational!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error during final system test:", error);
        process.exit(1);
    });