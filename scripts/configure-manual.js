const { ethers } = require("hardhat");

async function main() {
    console.log("🔧 Manual USDog System Configuration on BSC Mainnet...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Configuring with account:", deployer.address);

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

    const RAY = ethers.parseUnits("1", 27); // 10^27
    const WAD = ethers.parseEther("1"); // 10^18
    const RAD = ethers.parseUnits("1", 45); // 10^45

    console.log("🔧 Configuring system parameters using manual calls...");

    // 1. Configure Vat debt ceilings using direct contract calls
    console.log("🏦 Setting debt ceilings...");

    const vatContract = new ethers.Contract(addresses.vat, [
        "function file(bytes32 what, uint256 data) external",
        "function file(bytes32 ilk, bytes32 what, uint256 data) external"
    ], deployer);

    // Set collateral debt ceilings (10M each)
    const debtCeiling = RAD * 10000000n;
    await vatContract["file(bytes32,bytes32,uint256)"](
        ethers.encodeBytes32String("DOGE-A"),
        ethers.encodeBytes32String("line"),
        debtCeiling
    );
    await vatContract["file(bytes32,bytes32,uint256)"](
        ethers.encodeBytes32String("SHIB-A"),
        ethers.encodeBytes32String("line"),
        debtCeiling
    );

    // Set global debt ceiling (50M)
    await vatContract["file(bytes32,uint256)"](
        ethers.encodeBytes32String("Line"),
        RAD * 50000000n
    );
    console.log("✅ Set debt ceilings: 10M per collateral, 50M global");

    // 2. Configure Jug stability fees
    console.log("💸 Configuring stability fees...");

    const jugContract = new ethers.Contract(addresses.jug, [
        "function init(bytes32 ilk) external",
        "function file(bytes32 ilk, bytes32 what, uint256 data) external"
    ], deployer);

    await jugContract.init(ethers.encodeBytes32String("DOGE-A"));
    await jugContract.init(ethers.encodeBytes32String("SHIB-A"));

    // 2% APR = 1.000000000627937192491029810 per second
    const stabilityFee = "1000000000627937192491029810";
    await jugContract["file(bytes32,bytes32,uint256)"](
        ethers.encodeBytes32String("DOGE-A"),
        ethers.encodeBytes32String("duty"),
        stabilityFee
    );
    await jugContract["file(bytes32,bytes32,uint256)"](
        ethers.encodeBytes32String("SHIB-A"),
        ethers.encodeBytes32String("duty"),
        stabilityFee
    );
    console.log("✅ Set stability fees to 2% APR");

    // 3. Configure Dog liquidation system
    console.log("⚡ Configuring liquidation system...");

    const dogContract = new ethers.Contract(addresses.dog, [
        "function file(bytes32 ilk, bytes32 what, uint256 data) external",
        "function file(bytes32 ilk, bytes32 what, address clip) external"
    ], deployer);

    await dogContract["file(bytes32,bytes32,address)"](
        ethers.encodeBytes32String("DOGE-A"),
        ethers.encodeBytes32String("clip"),
        addresses.dogeClipper
    );

    // Set liquidation penalty (10%)
    const liquidationPenalty = (WAD * 110n) / 100n;
    await dogContract["file(bytes32,bytes32,uint256)"](
        ethers.encodeBytes32String("DOGE-A"),
        ethers.encodeBytes32String("chop"),
        liquidationPenalty
    );
    console.log("✅ Configured liquidation system with 10% penalty");

    // 4. Grant permissions
    console.log("🔗 Granting permissions...");

    const vatAuthContract = new ethers.Contract(addresses.vat, [
        "function rely(address usr) external"
    ], deployer);

    const stablecoinContract = new ethers.Contract(addresses.stablecoin, [
        "function rely(address usr) external"
    ], deployer);

    await vatAuthContract.rely(addresses.dogeJoin);
    await vatAuthContract.rely(addresses.shibJoin);
    await vatAuthContract.rely(addresses.daiJoin);
    await vatAuthContract.rely(addresses.dog);
    await vatAuthContract.rely(addresses.jug);
    await vatAuthContract.rely(addresses.pot);
    await vatAuthContract.rely(addresses.end);

    await stablecoinContract.rely(addresses.daiJoin);
    console.log("✅ Granted necessary permissions");

    console.log("\n🎉 Manual system configuration completed!");
    console.log("Note: Price feeds and liquidation ratios still need configuration due to interface issues.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error during manual configuration:", error);
        process.exit(1);
    });