const { ethers } = require("hardhat");

/**
 * End-to-end DOGE mint-and-exit test mirroring the frontend path:
 *  1) vat.frob(DOGE-A, u=v=w=user, dink=0, dart=wad)
 *  2) ensure vat.hope(DaiJoin)
 *  3) DaiJoin.exit(user, wad)
 *
 * Usage:
 *   AMOUNT=0.000001 npx hardhat run scripts/debug-doge-generate-exit.js --network bsc
 */
async function main() {
  const [signer] = await ethers.getSigners();
  const USER = process.env.USER || signer.address;
  const AMOUNT = process.env.AMOUNT || "0.000001";

  const addresses = {
    vat: "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be",
    stablecoin: "0xb1abd2a64b829596d7afefca31a6c984b5afaafb",
    daiJoin: "0xEae2f180ad117A407A595D31782e66D0dA727967",
  };

  const vat = await ethers.getContractAt("Vat", addresses.vat, signer);
  const stable = await ethers.getContractAt("StableCoin", addresses.stablecoin, signer);
  const join = await ethers.getContractAt("DaiJoin", addresses.daiJoin, signer);
  const DOGE_ILK = ethers.encodeBytes32String("DOGE-A");
  const wad = ethers.parseEther(AMOUNT);
  const RAD = 10n ** 27n;

  console.log("👤 User:", USER);
  console.log("🪙 Amount (wad):", wad.toString(), `(${AMOUNT} USDog)`);

  // Pre-state
  const urn0 = await vat.urns(DOGE_ILK, USER);
  const dai0 = await vat.dai(USER);
  const can0 = await vat.can(USER, addresses.daiJoin);
  const bal0 = await stable.balanceOf(USER);
  console.log("Before -> urn.ink:", urn0[0].toString(), "urn.art:", urn0[1].toString());
  console.log("Before -> dai[user] rad:", dai0.toString(), "wad:", (BigInt(dai0.toString())/RAD).toString());
  console.log("Before -> can[user][DaiJoin]:", can0.toString());
  console.log("Before -> USDog.balanceOf(user):", bal0.toString());

  // 1) frob mint only
  console.log("\n1) vat.frob(DOGE-A, dink=0, dart=wad) ...");
  const tx1 = await vat.frob(DOGE_ILK, USER, USER, USER, 0, wad);
  console.log("frob tx:", tx1.hash);
  await tx1.wait();

  // 2) ensure hope
  let can = await vat.can(USER, addresses.daiJoin);
  if (can === 0n) {
    console.log("\n2) vat.hope(DaiJoin) ...");
    const tx2 = await vat.hope(addresses.daiJoin);
    console.log("hope tx:", tx2.hash);
    await tx2.wait();
    can = await vat.can(USER, addresses.daiJoin);
  }
  console.log("can[user][DaiJoin]:", can.toString());

  // 3) exit
  console.log("\n3) DaiJoin.exit(user, wad) ...");
  const tx3 = await join.exit(USER, wad);
  console.log("exit tx:", tx3.hash);
  const rcpt3 = await tx3.wait();
  console.log("exit mined, status:", rcpt3.status);

  // Post-state
  const urn1 = await vat.urns(DOGE_ILK, USER);
  const dai1 = await vat.dai(USER);
  const bal1 = await stable.balanceOf(USER);
  console.log("\nAfter -> urn.ink:", urn1[0].toString(), "urn.art:", urn1[1].toString());
  console.log("After -> dai[user] rad:", dai1.toString(), "wad:", (BigInt(dai1.toString())/RAD).toString());
  console.log("After -> USDog.balanceOf(user):", bal1.toString());

  console.log("\n✅ DOGE generate-and-exit end-to-end complete.");
}

main().catch((e) => {
  console.error("❌ debug-doge-generate-exit error:", e);
  process.exit(1);
});