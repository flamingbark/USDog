const { ethers } = require("hardhat");

async function main() {
    console.log("🔧 Fixing Collateral Tracking Issue...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    // Contract addresses
    const addresses = {
        vat: "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be",
        dogeJoin: "0x9d57797222EE904d213E7637E429d10C8ea7125d",
        dogeToken: "0xba2ae424d960c26247dd6c32edc70b295c744c43"
    };

    // Get contract instances
    const vat = await ethers.getContractAt("Vat", addresses.vat);
    const dogeJoin = await ethers.getContractAt("DogeJoin", addresses.dogeJoin);

    // Use IERC20 interface for DOGE token
    const erc20Abi = [
        "function balanceOf(address) view returns (uint256)",
        "function decimals() view returns (uint8)"
    ];
    const dogeToken = new ethers.Contract(addresses.dogeToken, erc20Abi, deployer);

    // Check current state
    console.log("📊 Checking current state...");

    // Check DOGE balance in DogeJoin contract
    const dogeJoinBalance = await dogeToken.balanceOf(addresses.dogeJoin);
    console.log("DOGE in DogeJoin contract (raw):", dogeJoinBalance.toString());
    console.log("DOGE in DogeJoin contract (formatted):", ethers.formatEther(dogeJoinBalance));

    // Check Vat collateral tracking
    const ilk = ethers.encodeBytes32String("DOGE-A");
    const gemBalance = await vat.gem(ilk, deployer.address);
    console.log("Vat gem balance for deployer (raw):", gemBalance.toString());
    console.log("Vat gem balance for deployer (formatted):", ethers.formatEther(gemBalance));

    if (dogeJoinBalance > 0) {
        console.log("🔧 Checking collateral tracking...");

        // Calculate what the correct WAD amount should be (DOGE has 8 decimals, Vat uses 18)
        const correctWad18 = dogeJoinBalance * BigInt(10 ** 10); // 10^(18-8) = 10^10
        console.log("Expected Vat gem balance (raw):", correctWad18.toString());
        console.log("Expected Vat gem balance (formatted):", ethers.formatEther(correctWad18));
        console.log("Actual Vat gem balance (formatted):", ethers.formatEther(gemBalance));

        if (gemBalance < correctWad18) {
            console.log("🔧 Collateral tracking is incorrect - fixing...");

            // Calculate the difference that needs to be added
            const difference = correctWad18 - gemBalance;
            console.log("Difference to add (raw):", difference.toString());
            console.log("Difference to add (formatted):", ethers.formatEther(difference));

            // Check if deployer has Vat permissions
            const hasVatPermission = await vat.wards(deployer.address);
            console.log("Deployer Vat permission:", hasVatPermission.toString());

            if (hasVatPermission == 1) {
                console.log("✅ Deployer has Vat permissions, fixing collateral tracking...");

                // Credit the missing collateral to the deployer in Vat
                console.log("Calling vat.slip with difference:", difference.toString());
                await vat.slip(ilk, deployer.address, difference);
                console.log("✅ Collateral tracking fixed!");

                // Verify the fix
                const newGemBalance = await vat.gem(ilk, deployer.address);
                console.log("New Vat gem balance (raw):", newGemBalance.toString());
                console.log("New Vat gem balance (formatted):", ethers.formatEther(newGemBalance));
            } else {
                console.log("❌ Deployer does not have Vat permissions. Cannot fix automatically.");
                console.log("Manual fix required through governance.");
            }
        } else {
            console.log("✅ Collateral tracking appears correct");
        }
    } else {
        console.log("ℹ️ No DOGE collateral deposited");
    }

    console.log("\n🎉 Collateral tracking check complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error fixing collateral tracking:", error);
        process.exit(1);
    });