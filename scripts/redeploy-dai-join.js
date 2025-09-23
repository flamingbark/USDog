const { ethers } = require("hardhat");

async function main() {
  console.log("🔧 Redeploying DaiJoin (Stablecoin Join) on BSC...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const addresses = {
    vat: "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be",
    stablecoin: "0xb1abd2a64b829596d7afefca31a6c984b5afaafb"
  };

  // Deploy DaiJoin(vat, stablecoin)
  const DaiJoin = await ethers.getContractFactory("DaiJoin");
  const daiJoin = await DaiJoin.deploy(addresses.vat, addresses.stablecoin);
  await daiJoin.waitForDeployment();
  const daiJoinAddress = await daiJoin.getAddress();
  console.log("✅ New DaiJoin deployed at:", daiJoinAddress);

  // Wire permissions
  const vat = await ethers.getContractAt("Vat", addresses.vat);
  const stablecoin = await ethers.getContractAt("StableCoin", addresses.stablecoin);

  console.log("🔗 Granting Vat.rely and StableCoin.rely to DaiJoin...");
  await (await vat.rely(daiJoinAddress)).wait();
  await (await stablecoin.rely(daiJoinAddress)).wait();
  console.log("✅ Permissions granted");

  // Quick sanity checks
  const live = await daiJoin.live();
  const readVat = await daiJoin.vat();
  const readDai = await daiJoin.dai();
  const vatWard = await vat.wards(daiJoinAddress);
  const daiWard = await stablecoin.wards(daiJoinAddress);

  console.log("DaiJoin.live:", live.toString());
  console.log("DaiJoin.vat:", readVat);
  console.log("DaiJoin.dai:", readDai);
  console.log("Vat.wards[DaiJoin]:", vatWard.toString());
  console.log("StableCoin.wards[DaiJoin]:", daiWard.toString());

  // Persist address to file
  const fs = require("fs");
  fs.writeFileSync(
    "./new-dai-join-address.json",
    JSON.stringify({ daiJoin: daiJoinAddress }, null, 2)
  );
  console.log("💾 Saved new DaiJoin address to new-dai-join-address.json");

  console.log("\nNext steps:");
  console.log("- Update frontendnew/src/lib/contracts.ts CONTRACT_ADDRESSES.[bsc|bscTestnet].daiJoin");
  console.log("- Test exit() with tiny amount (0.000001) after ensuring Vat.hope is set");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error during DaiJoin redeploy:", error);
    process.exit(1);
  });