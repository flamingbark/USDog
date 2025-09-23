const { run } = require("hardhat");

async function main() {
    console.log("🔍 Verifying Contracts on BSCScan...\n");

    const contracts = [
        {
            name: "ShibJoin",
            address: "0xd88AF8a38Fc3719668FEae8477A0aeA584Ac69A5",
            constructorArguments: [
                "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be", // vat
                "0x2859e4544c4bb03966803b044a93563bd2d0dd4d"  // shib token
            ]
        },
        {
            name: "DogeJoin", 
            address: "0x794eE9786535056D8858DfbF98cEafCA5ca23526",
            constructorArguments: [
                "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be", // vat
                "0xba2ae424d960c26247dd6c32edc70b295c744c43"  // doge token
            ]
        }
    ];

    for (const contract of contracts) {
        try {
            console.log(`🔧 Verifying ${contract.name} at ${contract.address}...`);
            
            await run("verify:verify", {
                address: contract.address,
                constructorArguments: contract.constructorArguments,
                contract: `contracts/Join.sol:${contract.name}`,
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
    console.log("ShibJoin:", `https://bscscan.com/address/0xd88AF8a38Fc3719668FEae8477A0aeA584Ac69A5#code`);
    console.log("DogeJoin:", `https://bscscan.com/address/0x794eE9786535056D8858DfbF98cEafCA5ca23526#code`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Verification failed:", error);
        process.exit(1);
    });