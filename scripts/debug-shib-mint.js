const { ethers } = require("hardhat");

/**
 * Diagnose SHIB mint underflow/overflow (Panic(0x11))
 *
 * It will:
 *  - Resolve addresses from frontend config (new ShibJoin) and environment
 *  - Dump ILK, URN, GEM data for SHIB-A
 *  - Check ShibJoin wiring, decimals, live
 *  - Check permissions: vat.wards(ShibJoin), stablecoin.wards(DaiJoin)
 *  - Simulate frob with small mint (dart) to detect exact revert/panic
 *  - Try a real mint with tiny amount if simulation passes
 *
 * Usage:
 *   AMOUNT=0.000001 npx hardhat run scripts/debug-shib-mint.js --network bsc
 */

async function main() {
  const [signer] = await ethers.getSigners();
  const USER = process.env.USER || signer.address;
  const AMOUNT = process.env.AMOUNT || "0.000001";

  // Resolve addresses
  const addresses = {
    vat: "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be",
    stablecoin: "0xb1abd2a64b829596d7afefca31a6c984b5afaafb",
    // Frontend "NEW: Working ShibJoin"
    shibJoin: "0xd88AF8a38Fc3719668FEae8477A0aeA584Ac69A5",
    // Chain SHIB token
    shibToken: "0x2859e4544c4bb03966803b044a93563bd2d0dd4d",
    // New DaiJoin we deployed
    daiJoin: "0xEae2f180ad117A407A595D31782e66D0dA727967",
  };

  console.log("🔎 SHIB Mint Debug");
  console.log("User:", USER);
  console.log("Amount (USDog):", AMOUNT);
  console.log("Vat:", addresses.vat);
  console.log("ShibJoin:", addresses.shibJoin);
  console.log("DaiJoin:", addresses.daiJoin, "\n");

  const vat = await ethers.getContractAt("Vat", addresses.vat, signer);
  const stable = await ethers.getContractAt("StableCoin", addresses.stablecoin, signer);
  const shibJoin = await ethers.getContractAt("ShibJoin", addresses.shibJoin, signer);

  const SHIB_ILK = ethers.encodeBytes32String("SHIB-A");
  const wad = ethers.parseEther(AMOUNT);
  const RAD = 10n ** 27n;

  // 1) ShibJoin wiring
  console.log("🔧 ShibJoin wiring");
  try {
    const live = await shibJoin.live();
    const dec = await shibJoin.dec();
    const ilk = await shibJoin.ilk();
    const vatAddr = await shibJoin.vat();
    const gemAddr = await shibJoin.gem();
    console.log("- live:", live.toString());
    console.log("- dec:", dec.toString());
    console.log("- ilk:", ethers.decodeBytes32String(ilk));
    console.log("- vat:", vatAddr);
    console.log("- gem (SHIB token):", gemAddr, "\n");
  } catch (err) {
    console.log("❌ ShibJoin interface read failed:", err.message);
  }

  // 2) Permissions
  console.log("🔐 Permissions");
  const shibJoinWard = await vat.wards(addresses.shibJoin);
  const daiJoinWardVat = await vat.wards(addresses.daiJoin);
  const daiJoinWardStable = await stable.wards(addresses.daiJoin);
  console.log("- Vat.wards(ShibJoin):", shibJoinWard.toString());
  console.log("- Vat.wards(DaiJoin):", daiJoinWardVat.toString());
  console.log("- StableCoin.wards(DaiJoin):", daiJoinWardStable.toString(), "\n");

  // 3) ILK and URN state
  console.log("📊 ILK/URN/GEM state");
  const ilks = await vat.ilks(SHIB_ILK);
  const urn = await vat.urns(SHIB_ILK, USER);
  const freeGem = await vat.gem(SHIB_ILK, USER);
  const daiRad = await vat.dai(USER);
  console.log("- ilks.Art (total debt wad):", ilks[0].toString());
  console.log("- ilks.rate (ray):", ilks[1].toString());
  console.log("- ilks.spot (ray):", ilks[2].toString());
  console.log("- ilks.line (rad):", ilks[3].toString());
  console.log("- ilks.dust (rad):", ilks[4].toString());
  console.log("- urn.ink (locked wad):", urn[0].toString());
  console.log("- urn.art (debt wad):", urn[1].toString());
  console.log("- gem free (wad):", freeGem.toString());
  console.log("- dai(user) [rad]:", daiRad.toString(), " [wad]:", (BigInt(daiRad.toString())/RAD).toString(), "\n");

  // Sanity: ensure SHIB-A ilk initialized
  if (ilks[1] === 0n) {
    console.log("❌ SHIB-A ilk.rate is 0 (not initialized). Run init + configure spot/jug.");
    return;
  }

  // 4) Simulate frob mint only (dart = wad), no collateral change (dink = 0)
  console.log("🧪 Simulate frob: mint only (dink=0, dart=wad)");
  try {
    const data = vat.interface.encodeFunctionData("frob", [
      SHIB_ILK,
      USER,
      USER,
      USER,
      0,                 // dink
      wad                // dart
    ]);
    const ret = await ethers.provider.call({ to: addresses.vat, from: USER, data });
    console.log("✅ frob simulation OK, return:", ret);
  } catch (err) {
    dumpErr("frob simulation", err);
  }

  // 5) Simulate frob lock + mint (common UI path): dink = existing freeGem (or small), dart = wad
  const dinkTry = freeGem > 0n ? (freeGem < wad ? freeGem : wad) : 0n;
  if (dinkTry > 0n) {
    console.log("\n🧪 Simulate frob: lock+d mint (dinkTry>0)");
    try {
      const data2 = vat.interface.encodeFunctionData("frob", [
        SHIB_ILK,
        USER,
        USER,
        USER,
        dinkTry,
        wad
      ]);
      const ret2 = await ethers.provider.call({ to: addresses.vat, from: USER, data: data2 });
      console.log("✅ frob(lock+mint) simulation OK:", ret2);
    } catch (err) {
      dumpErr("frob(lock+mint) simulation", err);
    }
  }

  // 6) If can[user][DaiJoin] is 0, set hope to enable later exit
  const can = await vat.can(USER, addresses.daiJoin);
  if (can === 0n) {
    console.log("\n🔑 Setting vat.hope(DaiJoin) from USER for future exit...");
    const txH = await vat.hope(addresses.daiJoin);
    console.log("vat.hope tx:", txH.hash);
    await txH.wait();
  }

  console.log("\n✅ Diagnostics complete. If simulation showed Panic(0x11), the most likely causes are:");
  console.log("- Using a different ShibJoin than the one relied in Vat (check addresses)");
  console.log("- Attempting frob with dink > free gem (would underflow gem subtraction in _addInt)");
  console.log("- Extremely large dart causing rate*art overflow (unlikely for tiny amounts)");
  console.log("- Uninitialized SHIB-A (rate=0) is not the case here if above showed non-zero");
}

function dumpErr(label, err) {
  console.log(`❌ ${label} reverted.`);
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
    console.log("Detail:", JSON.stringify(info, null, 2));
  } catch {
    console.log("Detail (raw):", info);
  }
}

main().catch((e) => {
  console.error("❌ debug-shib-mint error:", e);
  process.exit(1);
});