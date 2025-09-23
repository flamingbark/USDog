const { ethers } = require("hardhat");

/**
 * Liquidation end-to-end test:
 * 1) Detect if a vault (USER, ILK) is unsafe (ink*spot < art*rate)
 * 2) If not unsafe, optionally force-unsafe by increasing mat via Spot.file and Spot.poke (requires wards on Spot)
 * 3) Trigger liquidation via Dog.bark(ILK, USER, KPR) and fetch auction id
 * 4) Verify Clipper has an active auction for this ILK by querying Dog.ilks(ILK).clip and Clipper.list()
 *
 * Optional 5) Place a partial bid with Clipper.take() using internal dai:
 *    - Join external USDog via DaiJoin.join to create internal dai
 *    - Call Clipper.take with max price and a small amt
 *
 * Usage:
 *   ILK=SHIB-A USER=0xYourVaultOwner KPR=0xYourKeeperAddress FORCE=1 BID=0.0 TAKE_MAX=999999999999999999999 npx hardhat run scripts/test-liquidations.js --network bsc
 *
 * Notes:
 * - FORCE=1 tries to set a very high mat (e.g., 500% RAY) then spot.poke(ILK) to make the position unsafe.
 * - BID & TAKE_MAX are optional to try purchasing collateral from the auction (requires internal dai).
 */

async function main() {
  const [signer] = await ethers.getSigners();

  const USER = process.env.USER || signer.address; // vault to test
  const ILK_NAME = process.env.ILK || "SHIB-A";
  const KPR = process.env.KPR || signer.address; // keeper address (receives incentives)
  const FORCE = process.env.FORCE === "1";
  const BID = process.env.BID || "0"; // collateral amount to buy in take() [wad]
  const TAKE_MAX = process.env.TAKE_MAX || "0"; // max acceptable price [ray]

  // Addresses from prior deployment/config scripts (dog and spot configured)
  // We will read clipper address dynamically from Dog.ilks(ILK)
  const addresses = {
    vat: "0xE22Ef9a84844a3D8a6Fd04607045F19d722A43Be",
    spot: "0x5f029d9b48162a809919e595c2b712f5cb039d19",
    dog:  "0x8F8f0E79cE4AAaC0E19826C3F730DC82B107AB88", // from configure-system-final
    daiJoin: "0xEae2f180ad117A407A595D31782e66D0dA727967",
    stablecoin: "0xb1abd2a64b829596d7afefca31a6c984b5afaafb",
  };

  const ILK = ethers.encodeBytes32String(ILK_NAME);
  const vat = await ethers.getContractAt("Vat", addresses.vat, signer);
  const dog = await ethers.getContractAt("Dog", addresses.dog, signer);
  const spot = await ethers.getContractAt("Spot", addresses.spot, signer);
  const daiJoin = await ethers.getContractAt("DaiJoin", addresses.daiJoin, signer);
  const usdog = await ethers.getContractAt("StableCoin", addresses.stablecoin, signer);

  // 1) Check unsafe condition
  const urn = await vat.urns(ILK, USER);
  const ink = BigInt(urn[0].toString()); // locked collateral [wad]
  const art = BigInt(urn[1].toString()); // debt [wad]

  const ilkData = await vat.ilks(ILK);
  const rate = BigInt(ilkData[1].toString()); // [ray]
  const spotVal = BigInt(ilkData[2].toString()); // [ray]
  const line = BigInt(ilkData[3].toString()); // [rad]
  const dust = BigInt(ilkData[4].toString()); // [rad]

  const lhs = ink * spotVal; // [wad]*[ray] ~ [rad]
  const rhs = art * rate;    // [wad]*[ray] ~ [rad]

  console.log("Vault state:");
  console.log("- ink (wad):", ink.toString());
  console.log("- art (wad):", art.toString());
  console.log("Vat.ilks:");
  console.log("- rate (ray):", rate.toString());
  console.log("- spot (ray):", spotVal.toString());
  console.log("- line (rad):", line.toString());
  console.log("- dust (rad):", dust.toString());
  console.log("Unsafe check: ink*spot < art*rate ? =>", lhs.toString(), "<", rhs.toString(), "=", lhs < rhs);

  if (art === 0n) {
    console.log("No debt on the vault; cannot liquidate a zero-debt position.");
    return;
  }

  // 2) If not unsafe and FORCE, raise mat and poke to reduce spot until unsafe
  if (!(lhs < rhs) && FORCE) {
    console.log("\nPosition is safe. Forcing unsafe by raising mat and poking Spot...");

    // Set mat to 500% (RAY * 5)
    const RAY = 10n ** 27n;
    const newMat = RAY * 5n;

    try {
      const tx1 = await spot["file(bytes32,bytes32,uint256)"](ILK, ethers.encodeBytes32String("mat"), newMat);
      console.log("spot.file(mat) tx:", tx1.hash);
      await tx1.wait();

      const tx2 = await spot.poke(ILK);
      console.log("spot.poke tx:", tx2.hash);
      await tx2.wait();
    } catch (e) {
      console.log("Failed to adjust mat/poke (lack of wards on Spot). Try creating an actually unsafe vault instead.");
    }

    // Recompute
    const ilkData2 = await vat.ilks(ILK);
    const spot2 = BigInt(ilkData2[2].toString());
    const lhs2 = ink * spot2;
    const rhs2 = art * rate;
    console.log("After poke -> spot (ray):", spot2.toString());
    console.log("Unsafe check:", lhs2.toString(), "<", rhs2.toString(), "=", lhs2 < rhs2);
  }

  // 3) Trigger bark
  console.log("\nTriggering liquidation via Dog.bark...");
  try {
    const barkTx = await dog.bark(ILK, USER, KPR);
    console.log("bark tx:", barkTx.hash);
    const barkRcpt = await barkTx.wait();
    console.log("bark mined status:", barkRcpt.status);
  } catch (e) {
    console.error("bark failed:", e.message || e);
    console.log("If not unsafe, set FORCE=1 or lower price via oracle, then re-run.");
    return;
  }

  // 4) Get clipper from Dog.ilks(ILK) and list active auctions
  const dogIlk = await dog.ilks(ILK);
  const clipAddr = dogIlk[0];
  console.log("Clipper address:", clipAddr);

  const clip = await ethers.getContractAt("Clipper", clipAddr, signer);
  const active = await clip.list();
  console.log("Active auctions:", active.map(x => x.toString()));

  if (active.length === 0) {
    console.log("No active auctions recorded by Clipper. Check bark logs and Dog.ilks.hole vs Dirt limits.");
    return;
  }

  const auctionId = active[active.length - 1];
  console.log("Latest auction id:", auctionId.toString());

  // Optional 5) Try to buy a tiny slice of collateral
  const bidAmt = ethers.parseEther(BID); // [wad]
  if (bidAmt > 0n) {
    // Ensure internal dai by joining small USDog from wallet
    const maxRay = TAKE_MAX !== "0" ? BigInt(TAKE_MAX) : (10n ** 45n); // huge ray default if not provided

    const need = bidAmt; // we will overfund dai by joining 'need' (simplified)
    console.log("\nJoining USDog", need.toString(), "for take() ...");
    const approveTx = await usdog.approve(addresses.daiJoin, need);
    await approveTx.wait();
    const joinTx = await daiJoin.join(signer.address, need);
    await joinTx.wait();

    console.log("Calling Clipper.take for auction id", auctionId.toString());
    try {
      const takeTx = await clip.take(auctionId, bidAmt, maxRay, signer.address, "0x");
      console.log("take tx:", takeTx.hash);
      await takeTx.wait();
      console.log("✅ take() succeeded.");
    } catch (e) {
      console.log("take() failed:", e.message || e);
    }
  }

  console.log("\n✅ Liquidation test script finished.");
}

main().catch((e) => {
  console.error("❌ test-liquidations error:", e);
  process.exit(1);
});