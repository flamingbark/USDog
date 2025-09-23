const { ethers } = require("ethers");

async function checkShibPermissions() {
    try {
        // Use BSC RPC URL directly
        const provider = new ethers.providers.JsonRpcProvider("https://bsc-dataseed.binance.org/");
        const VAT_ADDRESS = "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be";
        const ShibJoin = "0x5E03607Ce6ca0382c054e5E978a3d31A57758Df3";
        
        // Correct ABI for wards mapping
        const vatABI = ["function wards(address) view returns (uint256)"];
        const vat = new ethers.Contract(VAT_ADDRESS, vatABI, provider);
        const permission = await vat.wards(ShibJoin);
        console.log("ShibJoin permission:", permission.toString());
        console.log("Permission granted:", permission.eq(1) ? "YES" : "NO");
    } catch (error) {
        console.error("Error checking permissions:", error.message);
    }
}

checkShibPermissions();