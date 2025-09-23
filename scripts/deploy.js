const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Deploying USDog Stablecoin System on BSC...\n");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", balance.toString());

    const network = await ethers.provider.getNetwork();
    const chainId = Number(network.chainId);
    console.log("Chain ID:", chainId);

    // Contract factories
    const DSMath = await ethers.getContractFactory("DSMath");
    const Vat = await ethers.getContractFactory("Vat");
    const StableCoin = await ethers.getContractFactory("StableCoin");
    const GemJoin = await ethers.getContractFactory("GemJoin");
    const DogeJoin = await ethers.getContractFactory("DogeJoin");
    const ShibJoin = await ethers.getContractFactory("ShibJoin");
    const DaiJoin = await ethers.getContractFactory("DaiJoin");
    const Spot = await ethers.getContractFactory("Spot");
    const ChainlinkPriceFeed = await ethers.getContractFactory("ChainlinkPriceFeed");
    const Api3PriceFeed = await ethers.getContractFactory("Api3PriceFeed");
    const Dog = await ethers.getContractFactory("Dog");
    const Clipper = await ethers.getContractFactory("Clipper");
    const LinearDecrease = await ethers.getContractFactory("LinearDecrease");
    const Jug = await ethers.getContractFactory("Jug");
    const Vow = await ethers.getContractFactory("Vow");
    const Pot = await ethers.getContractFactory("Pot");
    const End = await ethers.getContractFactory("End");
    const Multicall = await ethers.getContractFactory("Multicall");

    const contracts = {};

    // ===============================
    // 2. Deploy Price Feeds
    // ===============================
    // 1. Deploy Core System
    // ===============================
    // 2. Deploy Price Feeds
    // ===============================
    console.log("📊 Using already deployed core system...");
    
    // Using already deployed Vat
    // contracts.vat = await Vat.deploy();
    // await contracts.vat.waitForDeployment();
    const vatAddress = "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be";
    console.log("✅ Vat deployed to:", vatAddress);

    // Using already deployed USDog token
    // contracts.stablecoin = await StableCoin.deploy(chainId);
    // await contracts.stablecoin.waitForDeployment();
    const stablecoinAddress = "0xb1abd2a64b829596d7afefca31a6c984b5afaafb";
    console.log("✅ USDog deployed to:", stablecoinAddress);

    // Using already deployed Spot (Price feed manager)
    // contracts.spot = await Spot.deploy(vatAddress);
    // await contracts.spot.waitForDeployment();
    const spotAddress = "0x5f029d9b48162a809919e595c2b712f5cb039d19";
    console.log("✅ Spot deployed to:", spotAddress);

    // ===============================
    // 2. Deploy Price Feeds
    // ===============================
    // 2. Deploy Chainlink Price Feeds
    // ===============================
    // 2. Deploy Price Feeds
    // ===============================
    console.log("\n💰 Setting up Chainlink price feeds...");
    
    // BSC Chainlink Price Feed Addresses
    const DOGE_USD_FEED = "0x3AB0A0d137D4F946fBB19eecc6e92E64660231C8"; // DOGE/USD on BSC
    const SHIB_USD_FEED = "0xA615Be6cb0f3F36A641858dB6F30B9242d0ABeD8"; // SHIB/USD on BSC
    
    contracts.dogePriceFeed = await ChainlinkPriceFeed.deploy(DOGE_USD_FEED);
    await contracts.dogePriceFeed.waitForDeployment();
    const dogePriceFeedAddress = await contracts.dogePriceFeed.getAddress();
    console.log("✅ DOGE Chainlink Price Feed deployed to:", dogePriceFeedAddress);

    // API3 SHIB Price Feed
    const SHIB_API3_FEED = "0x23336a53F95A6b78DDa5967CDDaCe12390ff010E";
    contracts.shibPriceFeed = await Api3PriceFeed.deploy(SHIB_API3_FEED);
    await contracts.shibPriceFeed.waitForDeployment();
    const shibPriceFeedAddress = await contracts.shibPriceFeed.getAddress();
    console.log("✅ SHIB API3 Price Feed deployed to:", shibPriceFeedAddress);

    // ===============================
    // 2. Deploy Price Feeds
    // ===============================
    // 3. Deploy Join Adapters
    // ===============================
    // 2. Deploy Price Feeds
    // ===============================
    console.log("\n🔗 Deploying join adapters...");

    // Real BSC Token Addresses
    const DOGE_TOKEN = "0xba2ae424d960c63147c624c9a5505711facf8614"; // DOGE on BSC
    const SHIB_TOKEN = "0x2859e4544c4bb03966803b044a93563bd2d0dd4d"; // SHIB on BSC
    
    // contracts.dogeJoin = await DogeJoin.deploy(vatAddress, DOGE_TOKEN);
    // await contracts.dogeJoin.waitForDeployment();
    const dogeJoinAddress = "0x09FA30f1397c9d208C3c7e7A99Ca7B4d274141c7";
    console.log("✅ DogeJoin deployed to:", dogeJoinAddress);

    // contracts.shibJoin = await ShibJoin.deploy(vatAddress, SHIB_TOKEN);
    // await contracts.shibJoin.waitForDeployment();
    const shibJoinAddress = "0x5E03607Ce6ca0382c054e5E978a3d31A57758Df3";
    console.log("✅ ShibJoin deployed to:", shibJoinAddress);

    // contracts.daiJoin = await DaiJoin.deploy(vatAddress, stablecoinAddress);
    // await contracts.daiJoin.waitForDeployment();
    const daiJoinAddress = "0xB1780C459493EBA4Cc921A68F19174cc441e96B7";
    console.log("✅ DaiJoin deployed to:", daiJoinAddress);

    // ===============================
    // 2. Deploy Price Feeds
    // ===============================
    // 4. Deploy Liquidation System
    // ===============================
    // 2. Deploy Price Feeds
    // ===============================
    console.log("\n⚡ Deploying liquidation system...");

    contracts.dog = await Dog.deploy(vatAddress);
    await contracts.dog.waitForDeployment();
    const dogAddress = await contracts.dog.getAddress();
    console.log("✅ Dog deployed to:", dogAddress);

    // Deploy price calculators
    contracts.calc = await LinearDecrease.deploy();
    await contracts.calc.waitForDeployment();
    const calcAddress = await contracts.calc.getAddress();
    console.log("✅ LinearDecrease calculator deployed to:", calcAddress);

    // Deploy clippers for each collateral type
    contracts.dogeClipper = await Clipper.deploy(
        vatAddress,
        spotAddress,
        dogAddress,
        ethers.encodeBytes32String("DOGE-A")
    );
    await contracts.dogeClipper.waitForDeployment();
    const dogeClipperAddress = await contracts.dogeClipper.getAddress();
    console.log("✅ DOGE Clipper deployed to:", dogeClipperAddress);

    // contracts.shibClipper = await Clipper.deploy(
        vatAddress,
        spotAddress,
        dogAddress,
        ethers.encodeBytes32String("SHIB-A")
    );
    await contracts.shibClipper.waitForDeployment();
    const shibClipperAddress = await contracts.shibClipper.getAddress();
    console.log("✅ SHIB Clipper deployed to:", shibClipperAddress);

    // ===============================
    // 2. Deploy Price Feeds
    // ===============================
    // 5. Deploy Economic Management
    // ===============================
    // 2. Deploy Price Feeds
    // ===============================
    console.log("\n💼 Deploying economic management...");

    contracts.vow = await Vow.deploy(
        vatAddress,
        ethers.ZeroAddress, // flapper - not used (no governance token)
        ethers.ZeroAddress  // flopper - not used (no governance token)
    );
    await contracts.vow.waitForDeployment();
    const vowAddress = await contracts.vow.getAddress();
    console.log("✅ Vow deployed to:", vowAddress);

    contracts.jug = await Jug.deploy(vatAddress);
    await contracts.jug.waitForDeployment();
    const jugAddress = await contracts.jug.getAddress();
    console.log("✅ Jug deployed to:", jugAddress);

    contracts.pot = await Pot.deploy(vatAddress);
    await contracts.pot.waitForDeployment();
    const potAddress = await contracts.pot.getAddress();
    console.log("✅ Pot deployed to:", potAddress);

    // ===============================
    // 2. Deploy Price Feeds
    // ===============================
    // 6. Deploy Emergency System
    // ===============================
    // 2. Deploy Price Feeds
    // ===============================
    console.log("\n🚨 Deploying emergency system...");

    contracts.end = await End.deploy();
    await contracts.end.waitForDeployment();
    const endAddress = await contracts.end.getAddress();
    console.log("✅ End deployed to:", endAddress);

    // ===============================
    // 2. Deploy Price Feeds
    // ===============================
    // 7. Deploy Utilities
    // ===============================
    // 2. Deploy Price Feeds
    // ===============================
    console.log("\n🔧 Deploying utilities...");

    contracts.multicall = await Multicall.deploy();
    await contracts.multicall.waitForDeployment();
    const multicallAddress = await contracts.multicall.getAddress();
    console.log("✅ Multicall deployed to:", multicallAddress);

    // ===============================
    // 2. Deploy Price Feeds
    // ===============================
    // 8. System Configuration
    // ===============================
    // 2. Deploy Price Feeds
    // ===============================
    console.log("\n⚙️  Configuring system...");

    const RAY = ethers.parseUnits("1", 27); // 10^27
    const WAD = ethers.parseEther("1"); // 10^18
    const RAD = ethers.parseUnits("1", 45); // 10^45

    // Initialize collateral types in Vat
    await contracts.vat.init(ethers.encodeBytes32String("DOGE-A"));
    await contracts.vat.init(ethers.encodeBytes32String("SHIB-A"));
    console.log("✅ Initialized collateral types");

    // Configure Spot price feeds
    await contracts.spot.file(
        ethers.encodeBytes32String("DOGE-A"),
        ethers.encodeBytes32String("pip"),
        dogePriceFeedAddress
    );
    await contracts.spot.file(
        ethers.encodeBytes32String("SHIB-A"),
        ethers.encodeBytes32String("pip"),
        shibPriceFeedAddress
    );

    // Set liquidation ratios (150% for both)
    const liquidationRatio = (RAY * 150n) / 100n; // 150%
    await contracts.spot.file(
        ethers.encodeBytes32String("DOGE-A"),
        ethers.encodeBytes32String("mat"),
        liquidationRatio
    );
    await contracts.spot.file(
        ethers.encodeBytes32String("SHIB-A"),
        ethers.encodeBytes32String("mat"),
        liquidationRatio
    );
    console.log("✅ Configured price feeds and liquidation ratios");

    // Set debt ceilings (10M for each collateral type)
    const debtCeiling = RAD * 10000000n; // 10M
    await contracts.vat.file(
        ethers.encodeBytes32String("DOGE-A"),
        ethers.encodeBytes32String("line"),
        debtCeiling
    );
    await contracts.vat.file(
        ethers.encodeBytes32String("SHIB-A"),
        ethers.encodeBytes32String("line"),
        debtCeiling
    );

    // Set global debt ceiling (50M total)
    await contracts.vat.file(
        ethers.encodeBytes32String("Line"),
        RAD * 50000000n
    );
    console.log("✅ Configured debt ceilings");

    // Set up stability fees (2% APR for both)
    await contracts.jug.init(ethers.encodeBytes32String("DOGE-A"));
    await contracts.jug.init(ethers.encodeBytes32String("SHIB-A"));
    
    // 2% APR = 1.000000000627937192491029810 per second
    const stabilityFee = "1000000000627937192491029810";
    await contracts.jug.file(
        ethers.encodeBytes32String("DOGE-A"),
        ethers.encodeBytes32String("duty"),
        stabilityFee
    );
    await contracts.jug.file(
        ethers.encodeBytes32String("SHIB-A"),
        ethers.encodeBytes32String("duty"),
        stabilityFee
    );
    console.log("✅ Configured stability fees");

    // Configure liquidation system
    await contracts.dog.file(
        ethers.encodeBytes32String("DOGE-A"),
        ethers.encodeBytes32String("clip"),
        dogeClipperAddress
    );
    await contracts.dog.file(
        ethers.encodeBytes32String("SHIB-A"),
        ethers.encodeBytes32String("clip"),
        shibClipperAddress
    );

    // Set liquidation penalty (10%)
    const liquidationPenalty = (WAD * 110n) / 100n; // 110% (10% penalty)
    await contracts.dog.file(
        ethers.encodeBytes32String("DOGE-A"),
        ethers.encodeBytes32String("chop"),
        liquidationPenalty
    );
    await contracts.dog.file(
        ethers.encodeBytes32String("SHIB-A"),
        ethers.encodeBytes32String("chop"),
        liquidationPenalty
    );
    console.log("✅ Configured liquidation system");

    // Grant necessary permissions
    await contracts.vat.rely(dogeJoinAddress);
    await contracts.vat.rely(shibJoinAddress);
    await contracts.vat.rely(daiJoinAddress);
    await contracts.vat.rely(dogAddress);
    await contracts.vat.rely(jugAddress);
    await contracts.vat.rely(potAddress);
    await contracts.vat.rely(endAddress);

    await contracts.stablecoin.rely(daiJoinAddress);
    
    console.log("✅ Granted permissions");

    // ===============================
    // 2. Deploy Price Feeds
    // ===============================
    // 9. Transfer Admin Rights to DAO Safe
    // ===============================
    // 2. Deploy Price Feeds
    // ===============================
    console.log("\n🔐 Transferring admin rights to DAO Safe...");
    
    const DAO_SAFE = process.env.DAO_SAFE_ADDRESS || "0x754dc60D811eebfAD39Db915eE0fD3905Ea4D978";
    
    // Grant admin rights to DAO Safe for all contracts
    const adminContracts = [
        contracts.vat,
        contracts.stablecoin,
        contracts.spot,
        contracts.dogePriceFeed,
        contracts.shibPriceFeed,
        contracts.dogeJoin,
        contracts.shibJoin,
        contracts.daiJoin,
        contracts.dog,
        contracts.dogeClipper,
        contracts.shibClipper,
        contracts.vow,
        contracts.jug,
        contracts.pot,
        contracts.end,
        contracts.multicall
    ];

    for (const contract of adminContracts) {
        try {
            await contract.rely(DAO_SAFE);
            console.log(`✅ Granted admin rights to DAO Safe`);
        } catch (error) {
            console.log(`⚠️  Contract doesn't have rely function`);
        }
    }

    // Revoke deployer admin rights (comment out for testing, uncomment for production)
    console.log("\n🚨 Revoking deployer admin rights...");
    for (const contract of adminContracts) {
        try {
            await contract.deny(deployer.address);
            console.log(`✅ Revoked deployer admin rights`);
        } catch (error) {
            console.log(`⚠️  Contract doesn't have deny function`);
        }
    }
    
    console.log("✅ Admin rights transferred to DAO Safe:", DAO_SAFE);

    // ===============================
    // 2. Deploy Price Feeds
    // ===============================
    // 10. Summary
    // ===============================
    // 2. Deploy Price Feeds
    // ===============================
    console.log("\n🎉 Deployment Summary:");
    console.log("=======================");
    
    const addresses = {
        vat: vatAddress,
        stablecoin: stablecoinAddress,
        spot: spotAddress,
        dogePriceFeed: dogePriceFeedAddress,
        shibPriceFeed: shibPriceFeedAddress,
        dogeJoin: dogeJoinAddress,
        shibJoin: shibJoinAddress,
        daiJoin: daiJoinAddress,
        dog: dogAddress,
        dogeClipper: dogeClipperAddress,
        shibClipper: shibClipperAddress,
        calc: calcAddress,
        vow: vowAddress,
        jug: jugAddress,
        pot: potAddress,
        end: endAddress,
        multicall: multicallAddress
    };

    Object.entries(addresses).forEach(([name, address]) => {
        console.log(`${name}: ${address}`);
    });

    console.log("\n📋 Next Steps:");
    console.log("1. Configure auction parameters");
    console.log("2. Test the system with small amounts on BSC");
    console.log("3. Monitor Chainlink price feeds");
    console.log("4. Set up proper access controls");
    
    // Save addresses to file
    const fs = require('fs');
    fs.writeFileSync('./deployed-addresses.json', JSON.stringify(addresses, null, 2));
    console.log("\n💾 Addresses saved to deployed-addresses.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error during deployment:", error);
        process.exit(1);
    });