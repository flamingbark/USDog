const { ethers } = require("hardhat");

async function main() {
  console.log("🔐 Setting Vat.hope(DaiJoin) for signer...\n");
  const [signer] = await ethers.getSigners();
  console.log("Signer:", signer.address);

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

  const vat = await ethers.getContractAt("Vat", "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be", signer);

  const beforeRaw = await vat.can(signer.address, daiJoin);
  const before = BigInt(beforeRaw.toString());
  console.log("Before can(signer, DaiJoin):", before.toString());

  if (before !== 1n) {
    const tx = await vat.hope(daiJoin);
    console.log("Sending vat.hope ...", tx.hash);
    await tx.wait();
  } else {
    console.log("Already hoped. Skipping.");
  }

  const afterRaw = await vat.can(signer.address, daiJoin);
  const after = BigInt(afterRaw.toString());
  console.log("After can(signer, DaiJoin):", after.toString());
  console.log("Done.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error("❌ Error:", e); process.exit(1); });