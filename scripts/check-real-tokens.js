const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Checking Real BSC Token Contracts...\n");

    const [user] = await ethers.getSigners();
    console.log("Checking with account:", user.address);

    // Real BSC token addresses
    const tokens = {
        SHIB: "0x2859e4544c4bb03966803b044a93563bd2d0dd4d",
        DOGE: "0xbA2aE424d960c26247Dd6c32edC70B295c744C43"
    };

    for (const [symbol, address] of Object.entries(tokens)) {
        console.log(`\n🔧 Checking ${symbol} token (${address}):`);

        // Try different ABI combinations to see what works
        try {
            // Test basic ERC20 functions
            const token = new ethers.Contract(address, [
                "function balanceOf(address) view returns (uint256)",
                "function totalSupply() view returns (uint256)",
                "function name() view returns (string)",
                "function symbol() view returns (string)"
            ], ethers.provider);

            const balance = await token.balanceOf(user.address);
            console.log(`✅ balanceOf: ${ethers.formatUnits(balance, 18)}`);

            const totalSupply = await token.totalSupply();
            console.log(`✅ totalSupply: ${ethers.formatUnits(totalSupply, 18)}`);

            const name = await token.name();
            console.log(`✅ name: ${name}`);

            const tokenSymbol = await token.symbol();
            console.log(`✅ symbol: ${tokenSymbol}`);

        } catch (error) {
            console.log(`❌ Standard ERC20 functions failed: ${error.message}`);
        }

        // Test decimals separately (this is where it likely fails)
        try {
            const tokenWithDecimals = new ethers.Contract(address, [
                "function decimals() view returns (uint8)"
            ], ethers.provider);

            const decimals = await tokenWithDecimals.decimals();
            console.log(`✅ decimals: ${decimals}`);

        } catch (error) {
            console.log(`❌ decimals() failed: ${error.message}`);
        }

        // Test transfer and approve (might have restrictions)
        try {
            const tokenWithTransfer = new ethers.Contract(address, [
                "function transfer(address, uint256) returns (bool)",
                "function approve(address, uint256) returns (bool)",
                "function allowance(address, address) view returns (uint256)"
            ], user);

            // Test allowance (should be safe)
            const allowance = await tokenWithTransfer.allowance(user.address, user.address);
            console.log(`✅ allowance: ${allowance.toString()}`);

            // Test transfer to self with 0 amount (should be safe)
            const transferTx = await tokenWithTransfer.transfer(user.address, 0);
            await transferTx.wait();
            console.log(`✅ transfer(0) successful`);

        } catch (error) {
            console.log(`❌ transfer/approve functions failed: ${error.message}`);
        }

        // Check if it's actually a proxy or wrapper
        try {
            const code = await ethers.provider.getCode(address);
            console.log(`Code length: ${code.length} bytes`);
            if (code.length < 100) {
                console.log(`⚠️  Very small contract - might be a proxy`);
            }
        } catch (error) {
            console.log(`❌ Code check failed: ${error.message}`);
        }
    }

    console.log("\n🎯 Real token check complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error during check:", error);
        process.exit(1);
    });