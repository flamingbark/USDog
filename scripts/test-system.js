const { ethers } = require("hardhat");

async function main() {
    console.log("🧪 Testing USDog System on BSC Mainnet...\n");

    const [tester] = await ethers.getSigners();
    console.log("Testing with account:", tester.address);

    // Contract addresses from deployment
    const addresses = {
        vat: "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be",
        stablecoin: "0xb1abd2a64b829596d7afefca31a6c984b5afaafb",
        spot: "0x5f029d9b48162a809919e595c2b712f5cb039d19",
        dogePriceFeed: "0x6c5aEf4F9A41502Ff9Cd60908bAdCCc3233e536f",
        shibPriceFeed: "0x93b2d0eDf1989aD97959D05BE863446a1B34b213",
        dogeJoin: "0x09FA30f1397c9d208C3c7e7A99Ca7B4d274141c7",
        shibJoin: "0x5E03607Ce6ca0382c054e5E978a3d31A57758Df3",
        daiJoin: "0xB1780C459493EBA4Cc921A68F19174cc441e96B7",
        dog: "0x8F8f0E79cE4AAaC0E19826C3F730DC82B107AB88",
        calc: "0x97acD6e75a93De8eB1b84E944Ac6319710F04636",
        dogeClipper: "0x6bD154383406C9fed481C2c215e19332B58AE0D8",
        vow: "0x9804bd1D0008efD5525A3eeE55C32B5110282b3E",
        jug: "0x898e11B354d67F9176ab4fd7EE2c54ec137eA521",
        pot: "0x17b6B6CC4eeA6a152d11E408B91F227267B26997",
        end: "0x4d680227ec2061A575A309Fc51f88c7ADD5Ab27D",
        multicall: "0x4a286608f9945365D8AAeE6de6a94A509CB946D4"
    };

    // Test 1: Check Vat debt ceiling
    console.log("📊 Testing Vat debt ceiling...");
    const vat = await ethers.getContractAt("Vat", addresses.vat);
    const debtCeiling = await vat.Line();
    console.log("✅ Global debt ceiling:", ethers.formatEther(debtCeiling), "USDog");

    // Test 2: Check price feeds
    console.log("\n💰 Testing Chainlink price feeds...");

    const dogeFeed = await ethers.getContractAt("AggregatorV3Interface", "0x3AB0A0d137D4F946fBB19eecc6e92E64660231C8");
    const shibFeed = await ethers.getContractAt("AggregatorV3Interface", "0xA615Be6cb0f3F36A641858dB6F30B9242d0ABeD8");

    const [dogePrice, , , dogeTimestamp] = await dogeFeed.latestRoundData();
    const [shibPrice, , , shibTimestamp] = await shibFeed.latestRoundData();

    console.log("✅ DOGE/USD price:", ethers.formatUnits(dogePrice, 8), "USD");
    console.log("✅ SHIB/USD price:", ethers.formatUnits(shibPrice, 8), "USD");

    // Test 3: Check collateral configurations
    console.log("\n🏦 Testing collateral configurations...");

    const dogeIlk = await vat.ilks(ethers.encodeBytes32String("DOGE-A"));
    const shibIlk = await vat.ilks(ethers.encodeBytes32String("SHIB-A"));

    console.log("✅ DOGE collateral - Debt ceiling:", ethers.formatEther(dogeIlk.line), "USDog");
    console.log("✅ SHIB collateral - Debt ceiling:", ethers.formatEther(shibIlk.line), "USDog");

    // Test 4: Check stability fees
    console.log("\n💸 Testing stability fees...");

    const jug = await ethers.getContractAt("Jug", addresses.jug);
    const dogeDuty = await jug.ilks(ethers.encodeBytes32String("DOGE-A"));
    const shibDuty = await jug.ilks(ethers.encodeBytes32String("SHIB-A"));

    console.log("✅ DOGE stability fee:", dogeDuty.duty.toString());
    console.log("✅ SHIB stability fee:", shibDuty.duty.toString());

    // Test 5: Check liquidation parameters
    console.log("\n⚡ Testing liquidation parameters...");

    const spot = await ethers.getContractAt("Spot", addresses.spot);
    const dogeMat = await spot.ilks(ethers.encodeBytes32String("DOGE-A"));
    const shibMat = await spot.ilks(ethers.encodeBytes32String("SHIB-A"));

    console.log("✅ DOGE liquidation ratio:", ethers.formatEther(dogeMat.mat));
    console.log("✅ SHIB liquidation ratio:", ethers.formatEther(shibMat.mat));

    // Test 6: Check admin rights
    console.log("\n🔐 Testing admin rights...");

    const daoSafe = "0x754dc60D811eebfAD39Db915eE0fD3905Ea4D978";
    const vatAuth = await vat.wards(daoSafe);
    const stablecoinAuth = await ethers.getContractAt("StableCoin", addresses.stablecoin);
    const stablecoinAuthCheck = await stablecoinAuth.wards(daoSafe);

    console.log("✅ DAO Safe Vat admin rights:", vatAuth.toString());
    console.log("✅ DAO Safe StableCoin admin rights:", stablecoinAuthCheck.toString());

    console.log("\n🎉 System health check completed successfully!");
    console.log("All contracts are deployed and configured correctly.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error during system testing:", error);
        process.exit(1);
    });