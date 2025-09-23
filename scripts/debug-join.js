const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Debugging DogeJoin Contract...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Debugging with account:", deployer.address);

    // Contract addresses
    const addresses = {
        vat: "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be",
        dogeJoin: "0x09FA30f1397c9d208C3c7e7A99Ca7B4d274141c7",
        dogeToken: "0xba2ae424d960c26247dd6c32edc70b295c744c43"
    };

    // Get contract instances
    const dogeJoin = await ethers.getContractAt("DogeJoin", addresses.dogeJoin);
    const dogeToken = new ethers.Contract(addresses.dogeToken, [
        "function balanceOf(address) view returns (uint256)"
    ], ethers.provider);

    console.log("🔧 Checking DogeJoin configuration...");

    // Check what the join contract has configured
    const vatAddress = await dogeJoin.vat();
    const gemAddress = await dogeJoin.gem();
    const ilk = await dogeJoin.ilk();

    console.log("DogeJoin.vat():", vatAddress);
    console.log("DogeJoin.gem():", gemAddress);
    console.log("DogeJoin.ilk():", ethers.decodeBytes32String(ilk));

    // Check if addresses match expected
    const vatCorrect = vatAddress === addresses.vat;
    const gemCorrect = gemAddress === addresses.dogeToken;
    const ilkCorrect = ethers.decodeBytes32String(ilk) === "DOGE-A";

    console.log("Vat address correct:", vatCorrect);
    console.log("Gem address correct:", gemCorrect);
    console.log("Ilk correct:", ilkCorrect);

    if (!vatCorrect || !gemCorrect || !ilkCorrect) {
        console.log("❌ DogeJoin contract not properly configured!");
        return;
    }

    // Check join contract DOGE balance
    const joinDogeBalance = await dogeToken.balanceOf(addresses.dogeJoin);
    console.log("DogeJoin DOGE balance:", ethers.formatUnits(joinDogeBalance, 8));

    console.log("\n🎯 Join contract debug complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error debugging join:", error);
        process.exit(1);
    });