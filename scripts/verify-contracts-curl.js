import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { config } from 'dotenv';

config();

const execAsync = promisify(exec);

const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY || '3FBKFF8AXVXFCG3QHD5K2S6J7UYTKIEM5C';

async function getContractSource(contractPath, contractName) {
    const contractFilePath = path.join(process.cwd(), 'contracts', contractPath);
    return fs.readFileSync(contractFilePath, 'utf8');
}

async function verifyContract(contractName, address, constructorArgs = [], contractPath) {
    console.log(`🔧 Verifying ${contractName} at ${address}...`);

    try {
        const sourceCode = await getContractSource(contractPath, contractName);

        // Encode constructor arguments
        let constructorArguements = '';
        if (constructorArgs.length > 0) {
            // Simple encoding for address and uint256 types
            constructorArguements = constructorArgs.map(arg => {
                if (typeof arg === 'string' && arg.startsWith('0x')) {
                    // Address
                    return arg.slice(2).padStart(64, '0');
                } else if (typeof arg === 'number') {
                    // Number
                    return arg.toString(16).padStart(64, '0');
                } else if (typeof arg === 'string' && arg.length === 66) {
                    // Already encoded bytes32
                    return arg.slice(2);
                }
                return arg;
            }).join('');
        }

        // Create form data file
        const formData = `apikey=${BSCSCAN_API_KEY}&module=contract&action=verifysourcecode&contractaddress=${address}&sourceCode=${encodeURIComponent(sourceCode)}&codeformat=solidity-single-file&contractname=${contractName}&compilerversion=v0.8.19+commit.7dd6d404&optimizationUsed=1&runs=200&constructorArguements=${constructorArguements}&evmversion=paris&licenseType=3`;

        const tempFile = `temp_${contractName}_${Date.now()}.txt`;
        fs.writeFileSync(tempFile, formData);

        // Create the curl command using file
        const curlCommand = `curl -X POST "https://api.bscscan.com/v2/api" -H "Content-Type: application/x-www-form-urlencoded" --data-binary @${tempFile}`;

        const { stdout, stderr } = await execAsync(curlCommand);

        // Clean up temp file
        fs.unlinkSync(tempFile);

        if (stderr) {
            console.log(`⚠️  stderr: ${stderr}`);
        }

        const result = JSON.parse(stdout);

        if (result.status === '1') {
            console.log(`✅ ${contractName} verification submitted successfully!`);
            console.log(`   GUID: ${result.result}`);

            // Check verification status after a delay
            setTimeout(() => checkVerificationStatus(result.result, contractName), 15000);
        } else {
            if (result.result && result.result.includes('Already Verified')) {
                console.log(`✅ ${contractName} already verified`);
            } else {
                console.log(`❌ ${contractName} verification failed:`, result.result);
            }
        }
    } catch (error) {
        console.log(`❌ ${contractName} verification failed:`, error.message);
    }
}

async function checkVerificationStatus(guid, contractName) {
    const curlCommand = `curl -X GET "https://api.bscscan.com/v2/api?apikey=${BSCSCAN_API_KEY}&module=contract&action=checkverifystatus&guid=${guid}"`;

    try {
        const { stdout } = await execAsync(curlCommand);
        const result = JSON.parse(stdout);

        if (result.status === '1') {
            console.log(`✅ ${contractName} verification completed successfully!`);
        } else {
            console.log(`⚠️  ${contractName} verification status:`, result.result);
        }
    } catch (error) {
        console.log(`❌ ${contractName} status check failed:`, error.message);
    }
}

async function main() {
    console.log("🔍 Verifying Contracts on Etherscan via curl...\n");

    const contracts = [
        // Core contracts
        { name: "Vat", address: "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be", args: [], path: "Vat.sol" },
        { name: "Spot", address: "0x5f029d9b48162a809919e595c2b712f5cb039d19", args: ["0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be"], path: "Spot.sol" },
        { name: "StableCoin", address: "0xb1abd2a64b829596d7afefca31a6c984b5afaafb", args: [1], path: "StableCoin.sol" },
        { name: "DaiJoin", address: "0xEae2f180ad117A407A595D31782e66D0dA727967", args: ["0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be", "0xb1abd2a64b829596d7afefca31a6c984b5afaafb"], path: "Join.sol" },
        { name: "Dog", address: "0x8F8f0E79cE4AAaC0E19826C3F730DC82B107AB88", args: ["0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be"], path: "Dog.sol" },
        { name: "Vow", address: "0x9804bd1D0008efD5525A3eeE55C32B5110282b3E", args: ["0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be", "0x0000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000"], path: "Vow.sol" },
        { name: "Jug", address: "0x898e11B354d67F9176ab4fd7EE2c54ec137eA521", args: ["0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be"], path: "Jug.sol" },
        { name: "Pot", address: "0x17b6B6CC4eeA6a152d11E408B91F227267B26997", args: ["0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be"], path: "Pot.sol" },
        { name: "End", address: "0x4d680227ec2061A575A309Fc51f88c7ADD5Ab27D", args: [], path: "End.sol" },
        { name: "Multicall", address: "0x4a286608f9945365D8AAeE6de6a94A509CB946D4", args: [], path: "Multicall.sol" },
        // Collateral contracts
        { name: "DogeJoin", address: "0x09FA30f1397c9d208C3c7e7A99Ca7B4d274141c7", args: ["0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be", "0xbA2aE424d960c26247Dd6c32edC70B295c744C43"], path: "Join.sol" },
        { name: "ShibJoin", address: "0x5E03607Ce6ca0382c054e5E978a3d31A57758Df3", args: ["0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be", "0x2859e4544C4bB03966803b044A93563Bd2D0DD4D"], path: "Join.sol" },
        { name: "DogePriceFeed", address: "0x6c5aEf4F9A41502Ff9Cd60908bAdCCc3233e536f", args: ["0x3AB0A0d137D4F946fBB19eecc6e92E64660231C8"], path: "PriceFeed.sol" },
        { name: "ShibPriceFeed", address: "0xA08FdbDD45e232420Fd379555A8e69cF00FBAdB2", args: ["0x23336a53F95A6b78DDa5967CDDaCe12390ff010E"], path: "PriceFeed.sol" },
        { name: "DogeClipper", address: "0x6bD154383406C9fed481C2c215e19332B58AE0D8", args: ["0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be", "0x5f029d9b48162a809919e595c2b712f5cb039d19", "0x8F8f0E79cE4AAaC0E19826C3F730DC82B107AB88", "0x444f47452d410000000000000000000000000000000000000000000000000000"], path: "Clip.sol" },
        { name: "ShibClipper", address: "0xB2E90DacB905F9a979AFbCc87Ea18404f077Da20", args: ["0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be", "0x5f029d9b48162a809919e595c2b712f5cb039d19", "0x8F8f0E79cE4AAaC0E19826C3F730DC82B107AB88", "0x534849422d410000000000000000000000000000000000000000000000000000"], path: "Clip.sol" },
        // Liquidation contracts
        { name: "LinearDecrease", address: "0x97acD6e75a93De8eB1b84E944Ac6319710F04636", args: [], path: "Calc.sol" },
        { name: "FlashLiquidator", address: "0x3dEB59255e499DA3A76cecF8B4C828b2Cc01deC3", args: ["0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be", "0xEae2f180ad117A407A595D31782e66D0dA727967"], path: "FlashLiquidator.sol" }
    ];

    // Process contracts in batches of 4 to avoid rate limiting
    const batchSize = 4;
    for (let i = 0; i < contracts.length; i += batchSize) {
        const batch = contracts.slice(i, i + batchSize);
        console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} contracts)...`);

        await Promise.all(batch.map(contract => verifyContract(contract.name, contract.address, contract.args, contract.path)));

        // Add delay between batches to avoid rate limiting
        if (i + batchSize < contracts.length) {
            console.log("⏳ Waiting 5 seconds before next batch...");
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }

    console.log("\n🎉 Contract verification complete!");
    console.log("🔗 Check on BscScan:");
    contracts.forEach(contract => {
        console.log(`${contract.name}: https://bscscan.com/address/${contract.address}#code`);
    });
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Verification failed:", error);
        process.exit(1);
    });