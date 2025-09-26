import hre from "hardhat";

async function verifyContracts(networkName) {
    console.log(`🔍 Verifying Contracts on ${networkName}...\n`);
    console.log(`Active Hardhat network: ${hre.network.name}`);

    if (hre.network.name === "hardhat") {
        console.error("❌ Cannot verify on the 'hardhat' network. Please specify a different network using --network.");
        process.exit(1);
    }

    const contracts = [
        // Core contracts
        {
            name: "Vat",
            address: "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be",
            constructorArguments: [],
            contract: "contracts/Vat.sol:Vat"
        },
        {
            name: "Spot",
            address: "0x5f029d9b48162a809919e595c2b712f5cb039d19",
            constructorArguments: ["0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be"],
            contract: "contracts/Spot.sol:Spot"
        },
        {
            name: "StableCoin",
            address: "0xb1abd2a64b829596d7afefca31a6c984b5afaafb",
            constructorArguments: [56], // BSC chainId
            contract: "contracts/StableCoin.sol:StableCoin"
        },
        {
            name: "DaiJoin",
            address: "0xEae2f180ad117A407A595D31782e66D0dA727967",
            constructorArguments: [
                "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be", // vat
                "0xb1abd2a64b829596d7afefca31a6c984b5afaafb"  // stablecoin
            ],
            contract: "contracts/Join.sol:DaiJoin"
        },
        {
            name: "Dog",
            address: "0x8F8f0E79cE4AAaC0E19826C3F730DC82B107AB88",
            constructorArguments: ["0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be"],
            contract: "contracts/Dog.sol:Dog"
        },
        {
            name: "Vow",
            address: "0x9804bd1D0008efD5525A3eeE55C32B5110282b3E",
            constructorArguments: [
                "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be", // vat
                "0x0000000000000000000000000000000000000000", // flapper
                "0x0000000000000000000000000000000000000000"  // flopper
            ],
            contract: "contracts/Vow.sol:Vow"
        },
        {
            name: "Jug",
            address: "0x898e11B354d67F9176ab4fd7EE2c54ec137eA521",
            constructorArguments: ["0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be"],
            contract: "contracts/Jug.sol:Jug"
        },
        {
            name: "Pot",
            address: "0x17b6B6CC4eeA6a152d11E408B91F227267B26997",
            constructorArguments: ["0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be"],
            contract: "contracts/Pot.sol:Pot",
            force: true
        },
        {
            name: "End",
            address: "0x4d680227ec2061A575A309Fc51f88c7ADD5Ab27D",
            constructorArguments: [],
            contract: "contracts/End.sol:End"
        },
        {
            name: "Multicall",
            address: "0x4a286608f9945365D8AAeE6de6a94A509CB946D4",
            constructorArguments: [],
            contract: "contracts/Multicall.sol:Multicall"
        },
        // Collateral contracts
        {
            name: "DogeJoin",
            address: "0x09FA30f1397c9d208C3c7e7A99Ca7B4d274141c7",
            constructorArguments: [
                "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be", // vat
                "0xbA2aE424d960c26247Dd6c32edC70B295c744C43"  // doge token
            ],
            contract: "contracts/Join.sol:DogeJoin"
        },
        {
            name: "ShibJoin",
            address: "0x5E03607Ce6ca0382c054e5E978a3d31A57758Df3",
            constructorArguments: [
                "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be", // vat
                "0x2859e4544C4bB03966803b044A93563Bd2D0DD4D"  // shib token
            ],
            contract: "contracts/Join.sol:ShibJoin"
        },
        {
            name: "DogePriceFeed",
            address: "0x6c5aEf4F9A41502Ff9Cd60908bAdCCc3233e536f",
            constructorArguments: ["0x3AB0A0d137D4F946fBB19eecc6e92E64660231C8"], // DOGE/USD Chainlink feed
            contract: "contracts/PriceFeed.sol:ChainlinkPriceFeed"
        },
        {
            name: "ShibPriceFeed",
            address: "0xA08FdbDD45e232420Fd379555A8e69cF00FBAdB2",
            constructorArguments: ["0x23336a53F95A6b78DDa5967CDDaCe12390ff010E"], // SHIB API3 feed
            contract: "contracts/PriceFeed.sol:Api3PriceFeed"
        },
        {
            name: "DogeClipper",
            address: "0x6bD154383406C9fed481C2c215e19332B58AE0D8",
            constructorArguments: [
                "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be", // vat
                "0x5f029d9b48162a809919e595c2b712f5cb039d19", // spot
                "0x8F8f0E79cE4AAaC0E19826C3F730DC82B107AB88", // dog
                "0x444f47452d410000000000000000000000000000000000000000000000000000" // DOGE-A encoded
            ],
            contract: "contracts/Clip.sol:Clipper"
        },
        {
            name: "ShibClipper",
            address: "0xB2E90DacB905F9a979AFbCc87Ea18404f077Da20",
            constructorArguments: [
                "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be", // vat
                "0x5f029d9b48162a809919e595c2b712f5cb039d19", // spot
                "0x8F8f0E79cE4AAaC0E19826C3F730DC82B107AB88", // dog
                "0x534849422d410000000000000000000000000000000000000000000000000000" // SHIB-A encoded
            ],
            contract: "contracts/Clip.sol:Clipper"
        },
        // Liquidation contracts
        {
            name: "LinearDecrease",
            address: "0x97acD6e75a93De8eB1b84E944Ac6319710F04636",
            constructorArguments: [],
            contract: "contracts/Calc.sol:LinearDecrease"
        },
        {
            name: "FlashLiquidator",
            address: "0x3dEB59255e499DA3A76cecF8B4C828b2Cc01deC3",
            constructorArguments: [
                "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be", // vat
                "0xEae2f180ad117A407A595D31782e66D0dA727967"  // daiJoin
            ],
            contract: "contracts/FlashLiquidator.sol:FlashLiquidator"
        }
    ];

    for (const contract of contracts) {
        try {
            console.log(`🔧 Verifying ${contract.name} at ${contract.address} on network ${networkName}...`);

            await hre.run("verify:verify", {
                address: contract.address,
                constructorArguments: contract.constructorArguments,
                contract: contract.contract,
                network: networkName // Explicitly pass the network
            });

            console.log(`✅ ${contract.name} verified successfully!`);
        } catch (error) {
            if (error.message.includes("Already Verified")) {
                console.log(`✅ ${contract.name} already verified`);
            } else {
                console.log(`❌ ${contract.name} verification failed:`, error.message);
            }
        }
    }

    console.log("\n🎉 Contract verification complete!");
    console.log("🔗 Check on BSCScan:");
    contracts.forEach(contract => {
        console.log(`${contract.name}: https://bscscan.com/address/${contract.address}#code`);
    });
}

export default verifyContracts;

async function main() {
    // Get the network name from the Hardhat Runtime Environment
    const networkName = hre.network.name;
    await verifyContracts(networkName);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Verification failed:", error);
        process.exit(1);
    });