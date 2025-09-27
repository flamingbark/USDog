import pkg from 'hardhat';
const { ethers } = pkg;
import fs from 'fs';

async function main() {
    console.log("🚀 Changing admin address for USDog Stablecoin System...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Running script with account:", deployer.address);
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", balance.toString());

    const newAdminAddress = process.env.NEW_ADMIN_ADDRESS;
    if (!newAdminAddress) {
        console.error("Please provide the NEW_ADMIN_ADDRESS environment variable.");
        process.exit(1);
    }
    console.log("New Admin Address:", newAdminAddress);

    // Contract ABIs (simplified to only include rely and deny)
    const AuthContractABI = [
        "function rely(address usr) external",
        "function deny(address usr) external",
        "function wards(address usr) view returns (uint256)"
    ];

    // Read deployed addresses from deploy.js (using hardcoded values for now)
    // Deployed Addresses from deployments/all-contracts.json
    const addresses = JSON.parse(fs.readFileSync("./deployments/all-contracts.json", "utf8"));

    const vatAddress = addresses.core.vat;
    const stablecoinAddress = addresses.core.stablecoin;
    const spotAddress = addresses.core.spot;
    const dogeJoinAddress = addresses.collateral.doge.join;
    const shibJoinAddress = addresses.collateral.shib.join;
    const daiJoinAddress = addresses.core.daiJoin;
    const dogAddress = addresses.core.dog;
    const dogeClipperAddress = addresses.collateral.doge.clipper;
    const shibClipperAddress = addresses.collateral.shib.clipper;
    const vowAddress = addresses.core.vow;
    const jugAddress = addresses.core.jug;
    const potAddress = addresses.core.pot;
    const endAddress = addresses.core.end;
    const multicallAddress = addresses.core.multicall;

    const contractList = [
        { name: "Vat", address: vatAddress },
        { name: "StableCoin", address: stablecoinAddress },
        { name: "Spot", address: spotAddress },
        { name: "DogeJoin", address: dogeJoinAddress },
        { name: "ShibJoin", address: shibJoinAddress },
        { name: "DaiJoin", address: daiJoinAddress },
        { name: "Dog", address: dogAddress },
        { name: "DogeClipper", address: dogeClipperAddress },
        { name: "ShibClipper", address: shibClipperAddress },
        { name: "Vow", address: vowAddress },
        { name: "Jug", address: jugAddress },
        { name: "Pot", address: potAddress },
        { name: "End", address: endAddress },
        { name: "Multicall", address: multicallAddress }
    ];

    for (const contractInfo of contractList) {
        if (!ethers.isAddress(contractInfo.address) || contractInfo.address === ethers.ZeroAddress) {
            console.log(`⚠️ Skipping ${contractInfo.name}: Invalid or Zero address provided.`);
            continue;
        }

        try {
            const contract = new ethers.Contract(contractInfo.address, AuthContractABI, deployer);

            // Grant new admin rights
            const currentAdminStatus = await contract.wards(newAdminAddress);
            if (currentAdminStatus == 0) {
                 await contract.rely(newAdminAddress);
                console.log(`✅ Granted admin rights to ${contractInfo.name} for ${newAdminAddress}`);
            } else {
                console.log(`➡️ ${newAdminAddress} already has admin rights on ${contractInfo.name}`);
            }

            // Revoke old admin rights (deployer in this case)
            // This part should be carefully considered in a real scenario.
            // Ensure the new admin has successfully taken over before revoking the old one.
            const deployerAdminStatus = await contract.wards(deployer.address);
            if (deployerAdminStatus == 1 && deployer.address !== newAdminAddress) {
                await contract.deny(deployer.address);
                console.log(`✅ Revoked old admin rights from ${contractInfo.name} for ${deployer.address}`);
            } else if (deployer.address === newAdminAddress) {
                console.log(`➡️ Deployer is the new admin for ${contractInfo.name}, skipping revoke.`);
            } else {
                console.log(`➡️ Deployer (${deployer.address}) does not have admin rights on ${contractInfo.name}, skipping revoke.`);
            }

        } catch (error) {
            console.error(`❌ Error processing ${contractInfo.name} (${contractInfo.address}):`, error.message);
        }
    }

    console.log("\nScript finished.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });