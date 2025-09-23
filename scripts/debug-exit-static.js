const { ethers } = require("hardhat");

/**
 * Static-call simulator for DaiJoin.exit to decode revert reasons.
 * Usage:
 *   USER=0xYourWallet AMOUNT=0.000001 npx hardhat run scripts/debug-exit-static.js --network bsc
 *
 * It:
 *  - Reads Vat.dai(user) [rad] and prints as wad
 *  - Encodes DaiJoin.exit(user, wad) and eth_call's it with from=user
 *  - Prints decoded revert info (reason / data) when failing
 */

async function main() {
  const USER = process.env.USER || "0x3263343c30107ec252C88C2718a1512089845D07";
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

  // Addresses from frontendnew/src/lib/contracts.ts (bsc)
  const addresses = {
    vat: "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be",
    stablecoin: "0xb1abd2a64b829596d7afefca31a6c984b5afaafb",
    daiJoin: resolvedDaiJoin,
  };

  const provider = ethers.provider;
  const vat = await ethers.getContractAt("Vat", addresses.vat);
  const daiJoin = await ethers.getContractAt("DaiJoin", addresses.daiJoin);

  const wad = ethers.parseUnits(AMOUNT, 18);
  const rad = wad * (10n ** 27n);

  console.log("🔎 Simulating DaiJoin.exit");
  console.log("- User:", USER);
  console.log("- Amount (wad):", wad.toString(), `(${AMOUNT} USDog)`);
  console.log("- Amount (rad):", rad.toString());

  // Preflight: internal balance and permission checks
  const daiRad = await vat.dai(USER);
  const daiWad = daiRad / (10n ** 27n);
  console.log("📊 Vat.dai(user) [rad]:", daiRad.toString());
  console.log("📊 Vat.dai(user) [wad]:", daiWad.toString());

  const can = await vat.can(USER, addresses.daiJoin);
  console.log("🔐 Vat.can(user, DaiJoin):", can.toString());

  // Prepare call data for exit(user, wad)
  const data = daiJoin.interface.encodeFunctionData("exit", [USER, wad]);

  console.log("\n🧪 eth_call simulate DaiJoin.exit(user, wad) with from=user ...");
  try {
    const ret = await provider.call({
      to: addresses.daiJoin,
      from: USER,
      data,
    });
    console.log("✅ Simulation succeeded. Return data:", ret);
  } catch (err) {
    // ethers v6 RpcError shapes can vary; dump as much as possible
    console.log("❌ Simulation reverted.");
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
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});