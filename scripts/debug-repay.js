const { ethers } = require("hardhat");

/**
 * Debug repay flow end-to-end:
 *  - Reads urn + ilk to compute exact repayWad and required joinWad (rate-aware)
 *  - Approves USDog -> DaiJoin, joins (wallet -> internal dai)
 *  - Calls vat.frob(ilk, u=v=w=user, dink=0, dart=-repayWad)
 *
 * Usage:
 *   ILK=SHIB-A AMOUNT=0.000001 npx hardhat run scripts/debug-repay.js --network bsc
 *   ILK=DOGE-A AMOUNT=0.000001 npx hardhat run scripts/debug-repay.js --network bsc
 */

async function main() {
  const [signer] = await ethers.getSigners();
  const USER = process.env.USER || signer.address;
  const ILK_NAME = process.env.ILK || "SHIB-A";
  const AMOUNT = process.env.AMOUNT || "0.000001";

  const addresses = {
    vat: "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be",
    stablecoin: "0xb1abd2a64b829596d7afefca31a6c984b5afaafb",
    daiJoin: "0xEae2f180ad117A407A595D31782e66D0dA727967",
  };

  const vat = await ethers.getContractAt("Vat", addresses.vat, signer);
  const stable = await ethers.getContractAt("StableCoin", addresses.stablecoin, signer);
  const join = await ethers.getContractAt("DaiJoin", addresses.daiJoin, signer);

  const ILK = ethers.encodeBytes32String(ILK_NAME);
  const wadReq = ethers.parseEther(AMOUNT);
  const RAY = 10n ** 27n;

  console.log("👤 User:", USER);
  console.log("🔧 ILK:", ILK_NAME);
  console.log("🪙 Requested repay wad:", wadReq.toString());

  // State
  const urn0 = await vat.urns(ILK, USER);
  const ilkData = await vat.ilks(ILK);
  const artWad = BigInt(urn0[1].toString()); // debt [wad]
  const rateRay = BigInt(ilkData[1].toString());
  const dustRad = BigInt(ilkData[4].toString());
  const walletBal = BigInt((await stable.balanceOf(USER)).toString());

  console.log("Debt art (wad):", artWad.toString());
  console.log("rate (ray):", rateRay.toString());
  console.log("dust (rad):", dustRad.toString());
  console.log("USDog wallet (wad):", walletBal.toString());

  if (artWad === 0n) {
    console.log("No outstanding debt; nothing to repay.");
    return;
  }

  // Cap repay to outstanding
  let repayWad = wadReq > artWad ? artWad : wadReq;

  // Dust enforcement
  const tabAfter = rateRay * (artWad - repayWad);
  if (artWad - repayWad > 0n && dustRad > 0n && tabAfter < dustRad) {
    console.log("Repay would leave dusty debt; switching to full repayment of art.");
    repayWad = artWad;
  }

  // Compute joinWad = ceil(repayWad * rate / 1e27)
  let joinWad = (repayWad * rateRay + (RAY - 1n)) / RAY;

  // Wallet balance guard
  if (walletBal < joinWad) {
    if (walletBal === 0n) throw new Error("Insufficient wallet USDog for repay");
    const newRepayWad = (walletBal * RAY) / rateRay;
    console.log("Adjusting for wallet balance. newRepayWad:", newRepayWad.toString());
    repayWad = newRepayWad > artWad ? artWad : newRepayWad;
    joinWad = walletBal;
  }

  console.log("Final repayWad (wad):", repayWad.toString());
  console.log("Join amount (wad):", joinWad.toString());

  // Approve
  console.log("\n🔑 Approving USDog -> DaiJoin...");
  let tx = await stable.approve(addresses.daiJoin, joinWad);
  console.log("approve tx:", tx.hash);
  await tx.wait();

  // Join external USDog -> internal dai
  console.log("\n🏦 Joining USDog into internal dai...");
  tx = await join.join(USER, joinWad);
  console.log("join tx:", tx.hash);
  await tx.wait();

  // Repay via frob(dart<0)
  console.log("\n🧮 vat.frob (repay)...");
  const negativeDart = -repayWad;
  tx = await vat.frob(ILK, USER, USER, USER, 0, negativeDart);
  console.log("frob tx:", tx.hash);
  const rcpt = await tx.wait();
  console.log("✅ frob mined, status:", rcpt.status);

  const urn1 = await vat.urns(ILK, USER);
  console.log("\n📊 After repay art (wad):", urn1[1].toString());
  console.log("Done.");
}

main().catch((e) => {
  console.error("❌ debug-repay error:", e);
  process.exit(1);
});