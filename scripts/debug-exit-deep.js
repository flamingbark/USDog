const { ethers } = require("hardhat");

/**
 * Deep debugger for DaiJoin.exit revert.
 * Steps:
 *  1) Dump DaiJoin wiring (vat, dai, live)
 *  2) Dump StableCoin.wards(DaiJoin)
 *  3) Dump Vat.dai(user) [rad/wad] and Vat.can(user, DaiJoin)
 *  4) Static call Vat.move(user -> DaiJoin, rad)
 *  5) Static call StableCoin.mint(user, wad) as if sent from DaiJoin
 *  6) Static call DaiJoin.exit(user, wad) end-to-end
 *
 * Usage:
 *   USER=0xYourWallet AMOUNT=0.000001 npx hardhat run scripts/debug-exit-deep.js --network bsc
 */

async function main() {
  const USER = process.env.USER || "0xD1F1CC33b06cF00884E4F74A2Bc8f2B11863A64B";
  const AMOUNT = process.env.AMOUNT || "0.000001";

  // Resolve DaiJoin address dynamically (env > new-dai-join-address.json > fallback)
  const fs = require('fs');
  let resolvedDaiJoin = process.env.DAI_JOIN;
  if (!resolvedDaiJoin) {
    try {
      const j = JSON.parse(fs.readFileSync('./new-dai-join-address.json', 'utf8'));
      if (j?.daiJoin) resolvedDaiJoin = j.daiJoin;
    } catch {}
  }
  if (!resolvedDaiJoin) {
    resolvedDaiJoin = "0xEae2f180ad117A407A595D31782e66D0dA727967";
  }

  const addresses = {
    vat: "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be",
    stablecoin: "0xb1abd2a64b829596d7afefca31a6c984b5afaafb",
    daiJoin: resolvedDaiJoin,
  };

  const provider = ethers.provider;

  const vat = await ethers.getContractAt("Vat", addresses.vat);
  const stable = await ethers.getContractAt("StableCoin", addresses.stablecoin);
  const daiJoin = await ethers.getContractAt("DaiJoin", addresses.daiJoin);

  const wad = ethers.parseUnits(AMOUNT, 18);
  const RAD = 10n ** 27n;
  const rad = wad * RAD;

  console.log("🔧 Wiring");
  const wiredVat = await daiJoin.vat();
  const wiredDai = await daiJoin.dai();
  const live = await daiJoin.live();
  console.log("- DaiJoin.vat():", wiredVat);
  console.log("- DaiJoin.dai():", wiredDai);
  console.log("- DaiJoin.live:", live.toString());

  console.log("\n🔐 StableCoin auth");
  const daiJoinWard = await stable.wards(addresses.daiJoin);
  console.log("- StableCoin.wards(DaiJoin):", daiJoinWard.toString());

  console.log("\n📊 User Vat state");
  const daiRad = await vat.dai(USER);
  const daiWad = daiRad / RAD;
  const can = await vat.can(USER, addresses.daiJoin);
  console.log("- Vat.dai(user) [rad]:", daiRad.toString());
  console.log("- Vat.dai(user) [wad]:", daiWad.toString());
  console.log("- Vat.can(user, DaiJoin):", can.toString());

  console.log("\n🧪 Step 1: simulate Vat.move(user -> DaiJoin, rad)");
  try {
    const dataMove = vat.interface.encodeFunctionData("move", [USER, addresses.daiJoin, rad]);
    const res = await provider.call({ to: addresses.vat, from: USER, data: dataMove });
    console.log("✅ Vat.move simulation OK. Ret:", res);
  } catch (err) {
    console.log("❌ Vat.move simulation reverted.");
    dumpErr(err);
  }

  console.log("\n🧪 Step 2: simulate StableCoin.mint(user, wad) as from DaiJoin");
  try {
    const dataMint = stable.interface.encodeFunctionData("mint", [USER, wad]);
    const res = await provider.call({ to: addresses.stablecoin, from: addresses.daiJoin, data: dataMint });
    console.log("✅ StableCoin.mint simulation OK. Ret:", res);
  } catch (err) {
    console.log("❌ StableCoin.mint simulation reverted.");
    dumpErr(err);
  }

  console.log("\n🧪 Step 3: simulate DaiJoin.exit(user, wad) end-to-end");
  try {
    const dataExit = daiJoin.interface.encodeFunctionData("exit", [USER, wad]);
    const res = await provider.call({ to: addresses.daiJoin, from: USER, data: dataExit });
    console.log("✅ DaiJoin.exit simulation OK. Ret:", res);
  } catch (err) {
    console.log("❌ DaiJoin.exit simulation reverted.");
    dumpErr(err);
  }

  // Extra: verify DaiJoin expects wad.mul(ONE) math won't overflow
  const ONE = (10n ** 27n);
  const mul = wad * ONE;
  console.log("\n🧮 Math check: wad * 1e27 =", mul.toString());
}

function dumpErr(err) {
  const info = {
    message: err?.message,
    shortMessage: err?.shortMessage,
    reason: err?.reason,
    code: err?.code,
    data: err?.data,
    error: err?.error,
    info: err?.info,
  };
  try {
    console.log("Revert detail:", JSON.stringify(info, null, 2));
  } catch {
    console.log("Revert detail (raw):", info);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});