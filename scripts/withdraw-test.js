const { ethers } = require("hardhat");

async function main() {
  console.log("💸 Performing on-chain DaiJoin.exit test...\n");

  const [signer] = await ethers.getSigners();
  const USER = process.env.USER || signer.address;
  const AMOUNT = process.env.AMOUNT || "0.000001";

  // Resolve DaiJoin
  const fs = require('fs');
  let daiJoin = process.env.DAI_JOIN;
  if (!daiJoin) {
    try {
      const j = JSON.parse(fs.readFileSync('./new-dai-join-address.json', 'utf8'));
      if (j?.daiJoin) daiJoin = j.daiJoin;
    } catch {}
  }
  if (!daiJoin) daiJoin = "0xEae2f180ad117A407A595D31782e66D0dA727967";

  const addresses = {
    vat: "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be",
    stablecoin: "0xb1abd2a64b829596d7afefca31a6c984b5afaafb",
    daiJoin,
  };

  const vat = await ethers.getContractAt("Vat", addresses.vat, signer);
  const stable = await ethers.getContractAt("StableCoin", addresses.stablecoin, signer);
  const join = await ethers.getContractAt("DaiJoin", addresses.daiJoin, signer);

  const wad = ethers.parseUnits(AMOUNT, 18);
  const RAD = 10n ** 27n;

  console.log("Signer:", signer.address);
  console.log("User:", USER);
  console.log("DaiJoin:", addresses.daiJoin);
  console.log("Amount (wad):", wad.toString(), `(${AMOUNT} USDog)\n`);

  // Pre-state
  const daiRadBefore = await vat.dai(USER);
  const daiWadBefore = (BigInt(daiRadBefore.toString()) / RAD).toString();
  const balBefore = await stable.balanceOf(USER);
  const canBefore = await vat.can(USER, addresses.daiJoin);
  console.log("📊 Before:");
  console.log("- Vat.dai(user) [rad]:", daiRadBefore.toString());
  console.log("- Vat.dai(user) [wad]:", daiWadBefore);
  console.log("- StableCoin.balanceOf(user):", balBefore.toString());
  console.log("- Vat.can(user, DaiJoin):", canBefore.toString());

  if (BigInt(canBefore.toString()) !== 1n) {
    console.log("\n🔐 Setting vat.hope(DaiJoin) from USER...");
    // hope must be sent from USER, ensure signer == USER
    if (signer.address.toLowerCase() !== USER.toLowerCase()) {
      throw new Error("Current signer does not match USER; set USER to signer or switch signer");
    }
    const txHope = await vat.hope(addresses.daiJoin);
    console.log("vat.hope tx:", txHope.hash);
    await txHope.wait();
  }

  const canAfterHope = await vat.can(USER, addresses.daiJoin);
  console.log("Vat.can(user, DaiJoin) after hope:", canAfterHope.toString());

  // Execute exit
  console.log("\n🚀 Calling DaiJoin.exit(user, wad)...");
  const tx = await join.exit(USER, wad);
  console.log("exit tx:", tx.hash);
  const rcpt = await tx.wait();
  console.log("✅ Mined. Status:", rcpt.status);

  // Post-state
  const daiRadAfter = await vat.dai(USER);
  const daiWadAfter = (BigInt(daiRadAfter.toString()) / RAD).toString();
  const balAfter = await stable.balanceOf(USER);
  console.log("\n📊 After:");
  console.log("- Vat.dai(user) [rad]:", daiRadAfter.toString());
  console.log("- Vat.dai(user) [wad]:", daiWadAfter);
  console.log("- StableCoin.balanceOf(user):", balAfter.toString());

  console.log("\n🎉 On-chain exit completed.");
}

main().catch((e) => {
  console.error("❌ Error in withdraw-test:", e);
  process.exit(1);
});