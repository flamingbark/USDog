const { ethers } = require("hardhat");

/**
 * Checks on-chain code and basic interface probe for configured contract addresses.
 * Focuses on DaiJoin being a real contract and callable with expected selectors.
 *
 * Usage:
 *   npx hardhat run scripts/check-address-code.js --network bsc
 */

async function main() {
  const addresses = {
    vat: "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be",
    stablecoin: "0xb1abd2a64b829596d7afefca31a6c984b5afaafb",
    daiJoin: "0xB1780C459493EBA4Cc921A68F19174cc441e96B7",
  };

  const provider = ethers.provider;

  for (const [name, addr] of Object.entries(addresses)) {
    const code = await provider.getCode(addr);
    const hasCode = code && code !== "0x";
    console.log(`${name}: ${addr} | code: ${hasCode ? `length=${code.length}` : "NONE"}`);
  }

  console.log("\n🔎 Probing DaiJoin interface (vat(), dai(), live(), exit()) …");
  try {
    const daiJoin = await ethers.getContractAt("DaiJoin", addresses.daiJoin);
    const v = await daiJoin.vat();
    const d = await daiJoin.dai();
    const live = await daiJoin.live();
    console.log(" - vat():", v);
    console.log(" - dai():", d);
    console.log(" - live:", live.toString());

    // light static probe of exit selector (doesn't execute state changes)
    const data = daiJoin.interface.encodeFunctionData("exit", [addresses.stablecoin, 1n]);
    const ret = await provider.call({ to: addresses.daiJoin, data });
    console.log(" - exit() selector present (call returned data length:", (ret || "").length, ")");
  } catch (err) {
    console.log("❌ DaiJoin interface probe failed (likely wrong address or not a DaiJoin):");
    dumpErr(err);
  }

  console.log("\n📌 Next step if DaiJoin has no code or probe fails:");
  console.log(" - We need the correct DaiJoin address. If you have a recent redeploy, share it or allow running the redeploy script.");
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
    console.log(JSON.stringify(info, null, 2));
  } catch {
    console.log(info);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});