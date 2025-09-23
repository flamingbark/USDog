const { expect } = require("chai");
const { ethers } = require("hardhat");
const { parseEther, formatBytes32String } = ethers.utils;

describe("USDog Stablecoin System", function () {
    let contracts = {};
    let signers = {};
    let constants = {};

    // Test constants
    const RAY = ethers.BigNumber.from("1000000000000000000000000000"); // 10^27
    const WAD = ethers.BigNumber.from("1000000000000000000"); // 10^18
    const RAD = ethers.BigNumber.from("1000000000000000000000000000000000000000000000"); // 10^45

    beforeEach(async function () {
        // Get signers
        [signers.deployer, signers.user1, signers.user2] = await ethers.getSigners();

        // Constants
        constants.DOGE_ILK = formatBytes32String("DOGE-A");
        constants.SHIB_ILK = formatBytes32String("SHIB-A");
        constants.chainId = await signers.deployer.getChainId();

        // ===============================
        // Deploy all contracts
        // ===============================
        
        // Core system
        const Vat = await ethers.getContractFactory("Vat");
        contracts.vat = await Vat.deploy();
        await contracts.vat.deployed();

        const StableCoin = await ethers.getContractFactory("StableCoin");
        contracts.stablecoin = await StableCoin.deploy(constants.chainId);
        await contracts.stablecoin.deployed();

        const Spot = await ethers.getContractFactory("Spot");
        contracts.spot = await Spot.deploy(contracts.vat.address);
        await contracts.spot.deployed();

        // Mock tokens for testing
        const MockDoge = await ethers.getContractFactory("MockDoge");
        contracts.doge = await MockDoge.deploy();
        await contracts.doge.deployed();

        const MockShib = await ethers.getContractFactory("MockShib");
        contracts.shib = await MockShib.deploy();
        await contracts.shib.deployed();

        // Price feeds
        const DogePriceFeed = await ethers.getContractFactory("DogePriceFeed");
        contracts.dogePriceFeed = await DogePriceFeed.deploy();
        await contracts.dogePriceFeed.deployed();

        const ShibPriceFeed = await ethers.getContractFactory("ShibPriceFeed");
        contracts.shibPriceFeed = await ShibPriceFeed.deploy();
        await contracts.shibPriceFeed.deployed();

        // Join adapters
        const DogeJoin = await ethers.getContractFactory("DogeJoin");
        contracts.dogeJoin = await DogeJoin.deploy(contracts.vat.address, contracts.doge.address);
        await contracts.dogeJoin.deployed();

        const ShibJoin = await ethers.getContractFactory("ShibJoin");
        contracts.shibJoin = await ShibJoin.deploy(contracts.vat.address, contracts.shib.address);
        await contracts.shibJoin.deployed();

        const DaiJoin = await ethers.getContractFactory("DaiJoin");
        contracts.daiJoin = await DaiJoin.deploy(contracts.vat.address, contracts.stablecoin.address);
        await contracts.daiJoin.deployed();

        // Liquidation system
        const Dog = await ethers.getContractFactory("Dog");
        contracts.dog = await Dog.deploy(contracts.vat.address);
        await contracts.dog.deployed();

        const LinearDecrease = await ethers.getContractFactory("LinearDecrease");
        contracts.calc = await LinearDecrease.deploy();
        await contracts.calc.deployed();

        const Clipper = await ethers.getContractFactory("Clipper");
        contracts.dogeClipper = await Clipper.deploy(
            contracts.vat.address,
            contracts.spot.address,
            contracts.dog.address,
            constants.DOGE_ILK
        );
        await contracts.dogeClipper.deployed();

        // Economic management
        const Vow = await ethers.getContractFactory("Vow");
        contracts.vow = await Vow.deploy(
            contracts.vat.address,
            ethers.constants.AddressZero, // flapper
            ethers.constants.AddressZero  // flopper
        );
        await contracts.vow.deployed();

        const Jug = await ethers.getContractFactory("Jug");
        contracts.jug = await Jug.deploy(contracts.vat.address);
        await contracts.jug.deployed();

        const Pot = await ethers.getContractFactory("Pot");
        contracts.pot = await Pot.deploy(contracts.vat.address);
        await contracts.pot.deployed();

        // ===============================
        // System Configuration
        // ===============================

        // Initialize collateral types
        await contracts.vat.init(constants.DOGE_ILK);
        await contracts.vat.init(constants.SHIB_ILK);

        // Configure price feeds
        await contracts.spot.file(constants.DOGE_ILK, formatBytes32String("pip"), contracts.dogePriceFeed.address);
        await contracts.spot.file(constants.SHIB_ILK, formatBytes32String("pip"), contracts.shibPriceFeed.address);

        // Set liquidation ratios (150%)
        const liquidationRatio = RAY.mul(150).div(100);
        await contracts.spot.file(constants.DOGE_ILK, formatBytes32String("mat"), liquidationRatio);
        await contracts.spot.file(constants.SHIB_ILK, formatBytes32String("mat"), liquidationRatio);

        // Set debt ceilings
        const debtCeiling = RAD.mul(1000000); // 1M for testing
        await contracts.vat.file(constants.DOGE_ILK, formatBytes32String("line"), debtCeiling);
        await contracts.vat.file(constants.SHIB_ILK, formatBytes32String("line"), debtCeiling);
        await contracts.vat.file(formatBytes32String("Line"), RAD.mul(10000000)); // 10M total

        // Set dust limits
        const dustLimit = RAD.mul(100); // 100 stablecoin minimum
        await contracts.vat.file(constants.DOGE_ILK, formatBytes32String("dust"), dustLimit);
        await contracts.vat.file(constants.SHIB_ILK, formatBytes32String("dust"), dustLimit);

        // Initialize stability fees
        await contracts.jug.init(constants.DOGE_ILK);
        await contracts.jug.init(constants.SHIB_ILK);
        await contracts.jug.file(formatBytes32String("vow"), contracts.vow.address);

        // Grant necessary permissions
        await contracts.vat.rely(contracts.dogeJoin.address);
        await contracts.vat.rely(contracts.shibJoin.address);
        await contracts.vat.rely(contracts.daiJoin.address);
        await contracts.vat.rely(contracts.dog.address);
        await contracts.vat.rely(contracts.jug.address);
        await contracts.vat.rely(contracts.pot.address);

        await contracts.stablecoin.rely(contracts.daiJoin.address);

        // Configure liquidation
        await contracts.dog.file(constants.DOGE_ILK, formatBytes32String("clip"), contracts.dogeClipper.address);
        await contracts.dog.file(constants.DOGE_ILK, formatBytes32String("chop"), WAD.mul(110).div(100)); // 10% penalty
        await contracts.dog.file(constants.DOGE_ILK, formatBytes32String("hole"), RAD.mul(100000)); // 100k limit

        await contracts.dogeClipper.file(formatBytes32String("calc"), contracts.calc.address);
        await contracts.dogeClipper.file(formatBytes32String("vow"), contracts.vow.address);

        // Update spot prices
        await contracts.spot.poke(constants.DOGE_ILK);
        await contracts.spot.poke(constants.SHIB_ILK);

        // Mint some test tokens to users
        await contracts.doge.mint(signers.user1.address, parseEther("1000000"));
        await contracts.shib.mint(signers.user1.address, parseEther("1000000000"));
    });

    describe("System Deployment", function () {
        it("Should deploy all contracts successfully", async function () {
            expect(contracts.vat.address).to.not.equal(ethers.constants.AddressZero);
            expect(contracts.stablecoin.address).to.not.equal(ethers.constants.AddressZero);
            expect(contracts.spot.address).to.not.equal(ethers.constants.AddressZero);
        });

        it("Should have correct initial configuration", async function () {
            const dogeIlk = await contracts.vat.ilks(constants.DOGE_ILK);
            expect(dogeIlk.rate).to.equal(RAY); // Should be 1.0 initially

            const totalDebtCeiling = await contracts.vat.Line();
            expect(totalDebtCeiling).to.equal(RAD.mul(10000000));
        });

        it("Should have correct token configurations", async function () {
            expect(await contracts.stablecoin.name()).to.equal("USDog");
            expect(await contracts.stablecoin.symbol()).to.equal("USDog");
            expect(await contracts.stablecoin.decimals()).to.equal(18);
        });
    });

    describe("Price Feeds", function () {
        it("Should return valid prices", async function () {
            const [dogePrice, dogeValid] = await contracts.dogePriceFeed.peek();
            const [shibPrice, shibValid] = await contracts.shibPriceFeed.peek();

            expect(dogeValid).to.be.true;
            expect(shibValid).to.be.true;
            expect(dogePrice).to.be.gt(0);
            expect(shibPrice).to.be.gt(0);
        });

        it("Should update spot prices correctly", async function () {
            await contracts.spot.poke(constants.DOGE_ILK);
            
            const dogeIlk = await contracts.vat.ilks(constants.DOGE_ILK);
            expect(dogeIlk.spot).to.be.gt(0);
        });
    });

    describe("Collateral Operations", function () {
        const collateralAmount = parseEther("1000"); // 1000 DOGE
        const stablecoinAmount = parseEther("50"); // 50 stablecoins

        beforeEach(async function () {
            // Approve tokens
            await contracts.doge.connect(signers.user1).approve(contracts.dogeJoin.address, collateralAmount);
        });

        it("Should allow depositing collateral", async function () {
            await contracts.dogeJoin.connect(signers.user1).join(signers.user1.address, collateralAmount);
            
            const gemBalance = await contracts.vat.gem(constants.DOGE_ILK, signers.user1.address);
            expect(gemBalance).to.equal(collateralAmount);
        });

        it("Should allow creating a CDP", async function () {
            await contracts.dogeJoin.connect(signers.user1).join(signers.user1.address, collateralAmount);

            // Create CDP
            await contracts.vat.connect(signers.user1).frob(
                constants.DOGE_ILK,
                signers.user1.address,
                signers.user1.address,
                signers.user1.address,
                collateralAmount,
                stablecoinAmount
            );

            const urn = await contracts.vat.urns(constants.DOGE_ILK, signers.user1.address);
            expect(urn.ink).to.equal(collateralAmount);
            expect(urn.art).to.equal(stablecoinAmount);
        });

        it("Should allow minting stablecoins", async function () {
            await contracts.dogeJoin.connect(signers.user1).join(signers.user1.address, collateralAmount);

            await contracts.vat.connect(signers.user1).frob(
                constants.DOGE_ILK,
                signers.user1.address,
                signers.user1.address,
                signers.user1.address,
                collateralAmount,
                stablecoinAmount
            );

            // Exit stablecoins
            await contracts.daiJoin.connect(signers.user1).exit(signers.user1.address, stablecoinAmount);

            const balance = await contracts.stablecoin.balanceOf(signers.user1.address);
            expect(balance).to.equal(stablecoinAmount);
        });

        it("Should prevent creating undercollateralized positions", async function () {
            await contracts.dogeJoin.connect(signers.user1).join(signers.user1.address, collateralAmount);

            // Try to draw too much debt (this should fail)
            const tooMuchDebt = parseEther("200"); // Way more than allowed
            
            await expect(
                contracts.vat.connect(signers.user1).frob(
                    constants.DOGE_ILK,
                    signers.user1.address,
                    signers.user1.address,
                    signers.user1.address,
                    collateralAmount,
                    tooMuchDebt
                )
            ).to.be.revertedWith("Vat/not-safe");
        });
    });

    describe("Liquidations", function () {
        const collateralAmount = parseEther("1000");
        const stablecoinAmount = parseEther("60"); // Close to liquidation threshold

        beforeEach(async function () {
            // Create a CDP close to liquidation
            await contracts.doge.connect(signers.user1).approve(contracts.dogeJoin.address, collateralAmount);
            await contracts.dogeJoin.connect(signers.user1).join(signers.user1.address, collateralAmount);
            await contracts.vat.connect(signers.user1).frob(
                constants.DOGE_ILK,
                signers.user1.address,
                signers.user1.address,
                signers.user1.address,
                collateralAmount,
                stablecoinAmount
            );
        });

        it("Should liquidate unsafe positions", async function () {
            // Simulate price drop by updating price feed
            await contracts.dogePriceFeed.poke(parseEther("0.05")); // Drop to $0.05
            await contracts.spot.poke(constants.DOGE_ILK);

            // Liquidate the position
            await contracts.dog.bark(constants.DOGE_ILK, signers.user1.address, signers.user2.address);

            // Check that liquidation occurred
            const urn = await contracts.vat.urns(constants.DOGE_ILK, signers.user1.address);
            expect(urn.art).to.be.lt(stablecoinAmount); // Debt should be reduced
        });
    });

    describe("Stability Fees", function () {
        const collateralAmount = parseEther("1000");
        const stablecoinAmount = parseEther("50");

        beforeEach(async function () {
            await contracts.doge.connect(signers.user1).approve(contracts.dogeJoin.address, collateralAmount);
            await contracts.dogeJoin.connect(signers.user1).join(signers.user1.address, collateralAmount);
            await contracts.vat.connect(signers.user1).frob(
                constants.DOGE_ILK,
                signers.user1.address,
                signers.user1.address,
                signers.user1.address,
                collateralAmount,
                stablecoinAmount
            );
        });

        it("Should accumulate stability fees", async function () {
            const stabilityFee = "1000000001000000000000000000"; // Small fee for testing
            await contracts.jug.file(constants.DOGE_ILK, formatBytes32String("duty"), stabilityFee);

            // Fast forward time
            await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
            await ethers.provider.send("evm_mine");

            const ilkBefore = await contracts.vat.ilks(constants.DOGE_ILK);
            await contracts.jug.drip(constants.DOGE_ILK);
            const ilkAfter = await contracts.vat.ilks(constants.DOGE_ILK);

            expect(ilkAfter.rate).to.be.gt(ilkBefore.rate);
        });
    });

    describe("Savings Rate", function () {
        it("Should allow joining and exiting the savings pot", async function () {
            // First create some stablecoins
            const collateralAmount = parseEther("1000");
            const stablecoinAmount = parseEther("50");

            await contracts.doge.connect(signers.user1).approve(contracts.dogeJoin.address, collateralAmount);
            await contracts.dogeJoin.connect(signers.user1).join(signers.user1.address, collateralAmount);
            await contracts.vat.connect(signers.user1).frob(
                constants.DOGE_ILK,
                signers.user1.address,
                signers.user1.address,
                signers.user1.address,
                collateralAmount,
                stablecoinAmount
            );

            // Now test pot operations
            await contracts.pot.drip(); // Update rate
            await contracts.pot.connect(signers.user1).join(stablecoinAmount);

            const pie = await contracts.pot.pie(signers.user1.address);
            expect(pie).to.equal(stablecoinAmount);
        });
    });

    describe("Emergency Shutdown", function () {
        it("Should allow emergency shutdown", async function () {
            const End = await ethers.getContractFactory("End");
            const end = await End.deploy();
            await end.deployed();

            // Configure end module
            await end.file(formatBytes32String("vat"), contracts.vat.address);
            await end.file(formatBytes32String("dog"), contracts.dog.address);
            await end.file(formatBytes32String("vow"), contracts.vow.address);
            await end.file(formatBytes32String("jug"), contracts.jug.address);
            await end.file(formatBytes32String("pot"), contracts.pot.address);
            await end.file(formatBytes32String("spot"), contracts.spot.address);

            await contracts.vat.rely(end.address);

            // Trigger emergency shutdown
            await end.cage();

            const live = await contracts.vat.live();
            expect(live).to.equal(0);
        });
    });

    describe("Multicall", function () {
        it("Should execute multiple calls in one transaction", async function () {
            const Multicall = await ethers.getContractFactory("Multicall");
            const multicall = await Multicall.deploy();
            await multicall.deployed();

            // Create calls array
            const calls = [
                {
                    target: contracts.dogePriceFeed.address,
                    callData: contracts.dogePriceFeed.interface.encodeFunctionData("peek")
                },
                {
                    target: contracts.shibPriceFeed.address,
                    callData: contracts.shibPriceFeed.interface.encodeFunctionData("peek")
                }
            ];

            const result = await multicall.aggregate(calls);
            expect(result.returnData).to.have.length(2);
        });
    });
});