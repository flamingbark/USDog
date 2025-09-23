const { ethers } = require("hardhat");

/**
 * Compute precise max additional USDog mint for SHIB-A using on-chain Vat invariants:
 * additional = min( floor((ink*spot)/rate) - art, floor((line - ArtTotal*rate)/rate) )
 * If dust & art==0: require additional >= ceil(dust/rate), else 0.
 *
 * Usage:
 *   USER=0xYourAddr npx hardhat run scripts/calc-safe-mint-shib.js --network bsc
 */
async function main() {
  const [signer] = await ethers.getSigners();
  const USER = process.env.USER || signer.address;

  const addresses = {
    vat: "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be",
  };

  const vat = await ethers.getContractAt("Vat", addresses.vat);
  const SHIB_ILK = ethers.encodeBytes32String("SHIB-A");
  const RAD = 10n ** 27n;

  const [ink, art] = await vat.urns(SHIB_ILK, USER); // [wad, wad]
  const ilk = await vat.ilks(SHIB_ILK);              // [Art(wad), rate(ray), spot(ray), line(rad), dust(rad)]

  const ArtTotalWad = BigInt(ilk[0].toString());
  const rateRay     = BigInt(ilk[1].toString());
  const spotRay     = BigInt(ilk[2].toString());
  const lineRad     = BigInt(ilk[3].toString());
  const dustRad     = BigInt(ilk[4].toString());

  const inkWad = BigInt(ink.toString());
  const artWad = BigInt(art.toString());

  console.log("User:", USER);
  console.log("ink (locked wad):", inkWad.toString());
  console.log("art (debt wad):  ", artWad.toString());
  console.log("Ilk ArtTotal(wad):", ArtTotalWad.toString());
  console.log("rate(ray):", rateRay.toString());
  console.log("spot(ray):", spotRay.toString());
  console.log("line(rad):", lineRad.toString());
  console.log("dust(rad):", dustRad.toString());

  if (rateRay === 0n || spotRay === 0n || inkWad === 0n) {
    console.log("Max additional mint (wad): 0");
    console.log("Max additional mint (USDog): 0");
    return;
  }

  // Safety headroom for user
  const maxArtAllowedWad = (inkWad * spotRay) / rateRay; // [wad]
  let additionalBySafetyWad = maxArtAllowedWad > artWad ? (maxArtAllowedWad - artWad) : 0n;

  // Per-ilk line headroom
  const currentIlkDebtRad = ArtTotalWad * rateRay;
  const remainingRad = lineRad > currentIlkDebtRad ? (lineRad - currentIlkDebtRad) : 0n;
  const remainingByLineWad = remainingRad / rateRay;

  let additionalWad = additionalBySafetyWad < remainingByLineWad ? additionalBySafetyWad : remainingByLineWad;

  // Dust check (if starting from zero debt)
  if (dustRad > 0n && artWad === 0n && additionalWad > 0n) {
    const requiredMinArtWad = (dustRad + rateRay - 1n) / rateRay; // ceil
    if (additionalWad < requiredMinArtWad) {
      console.log("additional < required dust threshold, returning 0");
      additionalWad = 0n;
    }
  }

  // 0.5% buffer
  if (additionalWad > 0n) {
    additionalWad = (additionalWad * 995n) / 1000n;
  }

  console.log("Max additional mint (wad):", additionalWad.toString());
  console.log("Max additional mint (USDog):", ethers.formatUnits(additionalWad, 18));
}

main().catch((e) => {
  console.error("❌ calc-safe-mint-shib error:", e);
  process.exit(1);
});