import { expect } from "chai";
import hardhat from "hardhat";
const { ethers } = hardhat;
import { parseEther } from "ethers";

describe("USDog Stablecoin System", function () {
  let contracts = {};
  let signers = {};

  // Scales
  const RAY = 10n ** 27n;
  const RAD = 10n ** 45n;

  const DOGE_ILK = ethers.encodeBytes32String("DOGE-A");
  const SHIB_ILK = ethers.encodeBytes32String("SHIB-A");

  beforeEach(async function () {
    [signers.deployer, signers.user1, signers.user2] = await ethers.getSigners();

    // Core
    const Vat = await ethers.getContractFactory("Vat");
    contracts.vat = await Vat.deploy();
    await contracts.vat.waitForDeployment();

    const StableCoin = await ethers.getContractFactory("StableCoin");
    contracts.stablecoin = await StableCoin.deploy(56);
    await contracts.stablecoin.waitForDeployment();

    const Spot = await ethers.getContractFactory("Spot");
    contracts.spot = await Spot.deploy(await contracts.vat.getAddress());
    await contracts.spot.waitForDeployment();

    // Tokens
    const MockDoge = await ethers.getContractFactory("MockDoge");
    contracts.doge = await MockDoge.deploy();
    await contracts.doge.waitForDeployment();
    const MockShib = await ethers.getContractFactory("MockShib");
    contracts.shib = await MockShib.deploy();
    await contracts.shib.waitForDeployment();

    // Price feeds
    const DogePriceFeed = await ethers.getContractFactory("DogePriceFeed");
    contracts.dogePriceFeed = await DogePriceFeed.deploy();
    await contracts.dogePriceFeed.waitForDeployment();
    const ShibPriceFeed = await ethers.getContractFactory("ShibPriceFeed");
    contracts.shibPriceFeed = await ShibPriceFeed.deploy();
    await contracts.shibPriceFeed.waitForDeployment();

    // Joins
    const DogeJoin = await ethers.getContractFactory("DogeJoin");
    contracts.dogeJoin = await DogeJoin.deploy(await contracts.vat.getAddress(), await contracts.doge.getAddress());
    await contracts.dogeJoin.waitForDeployment();
    const ShibJoin = await ethers.getContractFactory("ShibJoin");
    contracts.shibJoin = await ShibJoin.deploy(await contracts.vat.getAddress(), await contracts.shib.getAddress());
    await contracts.shibJoin.waitForDeployment();
    const DaiJoin = await ethers.getContractFactory("DaiJoin");
    contracts.daiJoin = await DaiJoin.deploy(await contracts.vat.getAddress(), await contracts.stablecoin.getAddress());
    await contracts.daiJoin.waitForDeployment();

    // Liquidations
    const Dog = await ethers.getContractFactory("Dog");
    contracts.dog = await Dog.deploy(await contracts.vat.getAddress());
    await contracts.dog.waitForDeployment();
    const LinearDecrease = await ethers.getContractFactory("LinearDecrease");
    contracts.calc = await LinearDecrease.deploy();
    await contracts.calc.waitForDeployment();
    const Clipper = await ethers.getContractFactory("Clipper");
    contracts.dogeClipper = await Clipper.deploy(
      await contracts.vat.getAddress(),
      await contracts.spot.getAddress(),
      await contracts.dog.getAddress(),
      DOGE_ILK
    );
    await contracts.dogeClipper.waitForDeployment();

    // Economics
    const Vow = await ethers.getContractFactory("Vow");
    contracts.vow = await Vow.deploy(await contracts.vat.getAddress(), ethers.ZeroAddress, ethers.ZeroAddress);
    await contracts.vow.waitForDeployment();
    const Jug = await ethers.getContractFactory("Jug");
    contracts.jug = await Jug.deploy(await contracts.vat.getAddress());
    await contracts.jug.waitForDeployment();
    const Pot = await ethers.getContractFactory("Pot");
    contracts.pot = await Pot.deploy(await contracts.vat.getAddress());
    await contracts.pot.waitForDeployment();

    // Configure system
    await contracts.vat.init(DOGE_ILK);
    await contracts.vat.init(SHIB_ILK);

    // pip
    await contracts.spot["file(bytes32,bytes32,address)"](DOGE_ILK, ethers.encodeBytes32String("pip"), await contracts.dogePriceFeed.getAddress());
    await contracts.spot["file(bytes32,bytes32,address)"](SHIB_ILK, ethers.encodeBytes32String("pip"), await contracts.shibPriceFeed.getAddress());
    // mat = 150%
    const liquidationRatio = (RAY * 150n) / 100n;
    await contracts.spot["file(bytes32,bytes32,uint256)"](DOGE_ILK, ethers.encodeBytes32String("mat"), liquidationRatio);
    await contracts.spot["file(bytes32,bytes32,uint256)"](SHIB_ILK, ethers.encodeBytes32String("mat"), liquidationRatio);

    // lines
    const perIlkLine = 1000000n * RAD; // generous
    await contracts.vat["file(bytes32,bytes32,uint256)"](DOGE_ILK, ethers.encodeBytes32String("line"), perIlkLine);
    await contracts.vat["file(bytes32,bytes32,uint256)"](SHIB_ILK, ethers.encodeBytes32String("line"), perIlkLine);
    await contracts.vat["file(bytes32,uint256)"](ethers.encodeBytes32String("Line"), 10000000n * RAD);

    // dust (1)
    await contracts.vat["file(bytes32,bytes32,uint256)"](DOGE_ILK, ethers.encodeBytes32String("dust"), 1n * RAD);
    await contracts.vat["file(bytes32,bytes32,uint256)"](SHIB_ILK, ethers.encodeBytes32String("dust"), 1n * RAD);

    // rely
    await contracts.vat.rely(await contracts.dogeJoin.getAddress());
    await contracts.vat.rely(await contracts.shibJoin.getAddress());
    await contracts.vat.rely(await contracts.daiJoin.getAddress());
    await contracts.vat.rely(await contracts.dog.getAddress());
    await contracts.vat.rely(await contracts.jug.getAddress());
    await contracts.vat.rely(await contracts.pot.getAddress());
    await contracts.vat.rely(await contracts.spot.getAddress());
    await contracts.stablecoin.rely(await contracts.daiJoin.getAddress());

    // liquidation wiring
    await contracts.dog["file(bytes32,bytes32,address)"](DOGE_ILK, ethers.encodeBytes32String("clip"), await contracts.dogeClipper.getAddress());
    await contracts.dog["file(bytes32,bytes32,uint256)"](DOGE_ILK, ethers.encodeBytes32String("chop"), (10n ** 18n) * 110n / 100n);
    await contracts.dog["file(bytes32,bytes32,uint256)"](DOGE_ILK, ethers.encodeBytes32String("hole"), 1000000n * RAD);
    await contracts.vow.rely(await contracts.dog.getAddress());
    await contracts.dogeClipper["file(bytes32,address)"](ethers.encodeBytes32String("calc"), await contracts.calc.getAddress());
    await contracts.dogeClipper["file(bytes32,address)"](ethers.encodeBytes32String("vow"), await contracts.vow.getAddress());
    await contracts.dog["file(bytes32,address)"](ethers.encodeBytes32String("vow"), await contracts.vow.getAddress());
    await contracts.dog["file(bytes32,uint256)"](ethers.encodeBytes32String("Hole"), 10000000n * RAD);
    await contracts.dogeClipper.rely(await contracts.dog.getAddress());

    // initial spot
    await contracts.spot.poke(DOGE_ILK);
    await contracts.spot.poke(SHIB_ILK);

    // Mint test tokens
    await contracts.doge.mint(signers.user1.address, parseEther("1000000"));
    await contracts.shib.mint(signers.user1.address, parseEther("1000000000"));
  });

  describe("System Deployment", function () {
    it("Should deploy all contracts successfully", async function () {
      expect(await contracts.vat.getAddress()).to.not.equal(ethers.ZeroAddress);
      expect(await contracts.spot.getAddress()).to.not.equal(ethers.ZeroAddress);
      expect(await contracts.stablecoin.getAddress()).to.not.equal(ethers.ZeroAddress);
    });
  });

  describe("Price Feeds", function () {
    it("Should return valid prices", async function () {
      const [dogePrice, dogeValid] = await contracts.dogePriceFeed.peek();
      const [shibPrice, shibValid] = await contracts.shibPriceFeed.peek();
      expect(dogeValid).to.equal(true);
      expect(shibValid).to.equal(true);
      expect(BigInt(dogePrice) > 0n).to.equal(true);
      expect(BigInt(shibPrice) > 0n).to.equal(true);
    });
  });

  describe("Collateral Operations", function () {
    const collateralAmount = parseEther("1000");
    const stablecoinAmount = parseEther("50");

    beforeEach(async function () {
      await contracts.doge.connect(signers.user1).approve(await contracts.dogeJoin.getAddress(), collateralAmount);
    });

    it("Should allow depositing collateral", async function () {
      await contracts.dogeJoin.connect(signers.user1).join(signers.user1.address, collateralAmount);
      const gemBalance = await contracts.vat.gem(DOGE_ILK, signers.user1.address);
      expect(gemBalance.toString()).to.equal(collateralAmount.toString());
    });

    it("Should allow creating a CDP", async function () {
      await contracts.dogeJoin.connect(signers.user1).join(signers.user1.address, collateralAmount);
      await contracts.vat.connect(signers.user1).frob(
        DOGE_ILK,
        signers.user1.address,
        signers.user1.address,
        signers.user1.address,
        collateralAmount,
        stablecoinAmount
      );
      const urn = await contracts.vat.urns(DOGE_ILK, signers.user1.address);
      expect(urn.ink.toString()).to.equal(collateralAmount.toString());
      expect(urn.art.toString()).to.equal(stablecoinAmount.toString());
    });

    it("Should allow minting stablecoins", async function () {
      await contracts.dogeJoin.connect(signers.user1).join(signers.user1.address, collateralAmount);
      await contracts.vat.connect(signers.user1).frob(
        DOGE_ILK,
        signers.user1.address,
        signers.user1.address,
        signers.user1.address,
        collateralAmount,
        stablecoinAmount
      );
      await contracts.vat.connect(signers.user1).hope(await contracts.daiJoin.getAddress());
      await contracts.daiJoin.connect(signers.user1).exit(signers.user1.address, stablecoinAmount);
      const balance = await contracts.stablecoin.balanceOf(signers.user1.address);
      expect(balance.toString()).to.equal(stablecoinAmount.toString());
    });

    it("Should prevent creating undercollateralized positions", async function () {
      await contracts.dogeJoin.connect(signers.user1).join(signers.user1.address, collateralAmount);
      // compute max debt from current params and exceed by 1
      const ilk = await contracts.vat.ilks(DOGE_ILK);
      const rate = BigInt(ilk.rate);
      const spot = BigInt(ilk.spot);
      const ink = BigInt(collateralAmount);
      const maxDebt = (ink * spot) / rate;
      const tooMuchDebt = maxDebt + parseEther("1");
      let threw = false;
      try {
        await contracts.vat.connect(signers.user1).frob(
          DOGE_ILK,
          signers.user1.address,
          signers.user1.address,
          signers.user1.address,
          collateralAmount,
          tooMuchDebt
        );
      } catch (e) {
        threw = true;
      }
      expect(threw).to.equal(true);
    });
  });

  describe("Liquidations", function () {
    const collateralAmount = parseEther("1000");
    const stablecoinAmount = parseEther("60");

    beforeEach(async function () {
      await contracts.doge.connect(signers.user1).approve(await contracts.dogeJoin.getAddress(), collateralAmount);
      await contracts.dogeJoin.connect(signers.user1).join(signers.user1.address, collateralAmount);
      await contracts.vat.connect(signers.user1).frob(
        DOGE_ILK,
        signers.user1.address,
        signers.user1.address,
        signers.user1.address,
        collateralAmount,
        stablecoinAmount
      );
    });

    it("Should liquidate unsafe positions", async function () {
      await contracts.dogePriceFeed.poke(parseEther("0.05"));
      await contracts.spot.poke(DOGE_ILK);
      await contracts.dog.bark(DOGE_ILK, signers.user1.address, signers.user2.address);
      const urn = await contracts.vat.urns(DOGE_ILK, signers.user1.address);
      expect(BigInt(urn.art) < parseEther("60")).to.equal(true);
    });
  });
});
