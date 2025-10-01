import { expect } from "chai";
import hardhat from "hardhat";
const { ethers } = hardhat;

describe("Debug Test", function () {
    it("Should deploy Vat", async function () {
        const Vat = await ethers.getContractFactory("Vat");
        const vat = await Vat.deploy();
        await vat.waitForDeployment();
        console.log("Vat deployed at:", vat.target);
        expect(vat.target).to.not.equal(ethers.ZeroAddress);
    });

    it("Should deploy StableCoin", async function () {
        const StableCoin = await ethers.getContractFactory("StableCoin");
        const stablecoin = await StableCoin.deploy(56);
        await stablecoin.waitForDeployment();
        console.log("StableCoin deployed at:", stablecoin.target);
        expect(stablecoin.target).to.not.equal(ethers.ZeroAddress);
    });

    it("Should deploy Spot", async function () {
        const Vat = await ethers.getContractFactory("Vat");
        const vat = await Vat.deploy();
        await vat.waitForDeployment();
        console.log("Vat deployed at:", vat.target);

        const Spot = await ethers.getContractFactory("Spot");
        const spot = await Spot.deploy(vat.target);
        await spot.waitForDeployment();
        console.log("Spot deployed at:", spot.target);
        expect(spot.target).to.not.equal(ethers.ZeroAddress);
    });

    it("Should deploy MockDoge", async function () {
        const MockDoge = await ethers.getContractFactory("MockDoge");
        const mockDoge = await MockDoge.deploy();
        await mockDoge.waitForDeployment();
        console.log("MockDoge deployed at:", mockDoge.target);
        expect(mockDoge.target).to.not.equal(ethers.ZeroAddress);
    });

    it("Should deploy DogeJoin", async function () {
        const Vat = await ethers.getContractFactory("Vat");
        const vat = await Vat.deploy();
        await vat.waitForDeployment();
        console.log("Vat deployed at:", vat.target);

        const MockDoge = await ethers.getContractFactory("MockDoge");
        const mockDoge = await MockDoge.deploy();
        await mockDoge.waitForDeployment();
        console.log("MockDoge deployed at:", mockDoge.target);

        const DogeJoin = await ethers.getContractFactory("DogeJoin");
        const dogeJoin = await DogeJoin.deploy(vat.target, mockDoge.target);
        await dogeJoin.waitForDeployment();
        console.log("DogeJoin deployed at:", dogeJoin.target);
        expect(dogeJoin.target).to.not.equal(ethers.ZeroAddress);
    });
});