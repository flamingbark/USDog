const { ethers } = require("hardhat");

/**
 * USDog withdraw preflight checker
 *
 * Verifies:
 *  - Vat.dai(user) internal balance (rad) and computed WAD
 *  - Vat.can(user, DaiJoin) permission (should be 1 after hope)
 *  - StableCoin.wards(DaiJoin) == 1 (DaiJoin authorized to mint)
 *
 * Network: BSC Mainnet (use --network bsc)
 */

async function main() {
  const user = process.env.USER || "0xD1F1CC33b06cF00884E4F74A2Bc8f2B11863A64B";

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
    spot: "0x5f029d9b48162a809919e595c2b712f5cb039d19",
    dogeJoin: "0x794eE9786535056D8858DfbF98cEafCA5ca23526",
    shibJoin: "0xd88AF8a38Fc3719668FEae8477A0aeA584Ac69A5",
    daiJoin: resolvedDaiJoin,
  };

  console.log("🔎 USDog Withdraw Preflight (BSC)");
  console.log("User:", user);
  console.log("Vat:", addresses.vat);
  console.log("StableCoin:", addresses.stablecoin);
  console.log("DaiJoin:", addresses.daiJoin);
  console.log("");

  const vat = await ethers.getContractAt("Vat", addresses.vat);
  const stablecoin = await ethers.getContractAt("StableCoin", addresses.stablecoin);

  // Read Vat.dai(user) [rad]
  const daiRad = await vat.dai(user);
  const daiRadBI = BigInt(daiRad.toString());

  // Convert rad -> wad (divide by 1e27)
  const RAD = 10n ** 27n;
  const daiWad = daiRadBI / RAD;

  // Vat.can(user, DaiJoin) permission (1 means allowed)
  const can = await vat.can(user, addresses.daiJoin);
  const canBI = BigInt(can.toString());

  // StableCoin.wards(DaiJoin) must be 1 for DaiJoin to mint
  const wardsDaiJoin = await stablecoin.wards(addresses.daiJoin);
  const wardsBI = BigInt(wardsDaiJoin.toString());

  console.log("📊 Values");
  console.log("- Vat.dai(user) [rad]:", daiRadBI.toString());
  console.log("- Vat.dai(user) [wad]:", daiWad.toString());
  console.log("- Vat.can(user, DaiJoin):", canBI.toString(), canBI === 1n ? "(OK)" : "(NOT SET)");
  console.log("- StableCoin.wards(DaiJoin):", wardsBI.toString(), wardsBI === 1n ? "(OK)" : "(NOT SET)");
  console.log("");

  // Explanations
  console.log("🧭 Expectations");
  console.log("- Vat.dai(user) [wad] must be >= the amount you are withdrawing.");
  console.log("- Vat.can(user, DaiJoin) must be 1 (set via vat.hope(DaiJoin)).");
  console.log("- StableCoin.wards(DaiJoin) must be 1 (governance must call StableCoin.rely(DaiJoin)).");
  console.log("");

  // Simple status summary
  console.log("✅ Ready to withdraw conditions:");
  console.log("- Permission (Vat.can):", canBI === 1n ? "YES" : "NO");
  console.log("- DaiJoin authorized to mint (StableCoin.wards):", wardsBI === 1n ? "YES" : "NO");
  console.log("- Internal balance exists (Vat.dai > 0):", daiWad > 0n ? "YES" : "NO");

  console.log("\nℹ️ To change user address, run with: USER=0xYourAddress npx hardhat run scripts/check-withdraw-preflight.js --network bsc");
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});