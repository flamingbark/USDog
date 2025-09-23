const { ethers } = require("hardhat");

/**
 * Send a real on-chain frob for SHIB-A with no collateral change (dink=0) and a tiny mint (dart>0).
 * Helps isolate frontend vs protocol errors for "mint using SHIB" path.
 *
 * Usage:
 *   AMOUNT=0.000001 npx hardhat run scripts/mint-only-shib.js --network bsc
 */
async function main() {
  const [signer] = await ethers.getSigners();
  const USER = process.env.USER || signer.address;
  const AMOUNT = process.env.AMOUNT || "0.000001";

  const addresses = {
    vat: "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be",
    daiJoin: "0xEae2f180ad117A407A595D31782e66D0dA727967",
  };

  console.log("🏦 SHIB-A mint-only test");
  console.log("Signer:", signer.address);
  console.log("User:", USER);
  console.log("Amount (USDog):", AMOUNT);

  const vat = await ethers.getContractAt("Vat", addresses.vat, signer);
  const SHIB_ILK = ethers.encodeBytes32String("SHIB-A");
  const wad = ethers.parseEther(AMOUNT);
  const RAD = 10n ** 27n;

  // Dump state
  const [ink, art] = await vat.urns(SHIB_ILK, USER);
  const daiRad = await vat.dai(USER);
  console.log("Before -> urn.ink (wad):", ink.toString(), " urn.art (wad):", art.toString());
  console.log("Before -> dai(user) [rad]:", daiRad.toString(), " [wad]:", (BigInt(daiRad.toString())/RAD).toString());

  console.log("\n🧪 Sending vat.frob(SHIB-A, u=v=w=USER, dink=0, dart=wad) ...");
  const tx = await vat.frob(SHIB_ILK, USER, USER, USER, 0, wad);
  console.log("tx:", tx.hash);
  const rcpt = await tx.wait();
  console.log("✅ Mined. status:", rcpt.status);

  const [inkA, artA] = await vat.urns(SHIB_ILK, USER);
  const daiRadA = await vat.dai(USER);
  console.log("\nAfter -> urn.ink (wad):", inkA.toString(), " urn.art (wad):", artA.toString());
  console.log("After -> dai(user) [rad]:", daiRadA.toString(), " [wad]:", (BigInt(daiRadA.toString())/RAD).toString());
}

main().catch((e) => {
  console.error("❌ mint-only-shib error:", e);
  process.exit(1);
});