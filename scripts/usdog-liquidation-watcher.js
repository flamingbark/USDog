'use strict';

require('dotenv').config();

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Minimal ABIs
const DOG_ABI = [
  'event Bark(bytes32 indexed ilk, address indexed urn, uint256 ink, uint256 art, uint256 due, address clip, uint256 id)'
];

const FLASH_LIQUIDATOR_ABI = [
  'function liquidateMemeCollateral(address borrower, address collateralVToken, address debtVToken, uint256 repayAmount, address flashLoanPool) external',
  'function addCollateral(address token, address join) external',
  'function setDog(address dog_) external',
  'function setIlk(address token, bytes32 ilk_) external'
];

function loadDeployments() {
  const mainnetFile = path.join(__dirname, '..', 'deployments', 'mainnet-addresses.json');
  const flashFile = path.join(__dirname, '..', 'deployments', 'flash-liquidator.json');
  const mainnet = JSON.parse(fs.readFileSync(mainnetFile, 'utf8'));
  const flash = JSON.parse(fs.readFileSync(flashFile, 'utf8'));
  return { mainnet, flash };
}

function getFlashPoolForIlk(ilkSymbol, mainnet) {
  const pools = (mainnet.flashLoan && mainnet.flashLoan.pools) || {};
  if (ilkSymbol === 'DOGE-A') return pools['DOGE-WBNB'] || null;
  if (ilkSymbol === 'SHIB-A') return pools['SHIB-WBNB'] || null;
  return null;
}

async function main() {
  const BSC_RPC_URL = process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/';
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  if (!PRIVATE_KEY) throw new Error('PRIVATE_KEY is required');

  const { mainnet, flash } = loadDeployments();

  const provider = new ethers.JsonRpcProvider(BSC_RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  const dogAddress = mainnet.core.dog;
  const dog = new ethers.Contract(dogAddress, DOG_ABI, provider);

  const flashAddr = process.env.FLASH_LIQUIDATOR || flash.flashLiquidator;
  if (!flashAddr) throw new Error('FLASH_LIQUIDATOR not set and no deployments/flash-liquidator.json found');
  const liquidator = new ethers.Contract(flashAddr, FLASH_LIQUIDATOR_ABI, wallet);

  const dogeToken = mainnet.collateral.doge.token;
  const shibToken = mainnet.collateral.shib.token;
  const dogeIlk = mainnet.collateral.doge.ilk; // e.g. 'DOGE-A'
  const shibIlk = mainnet.collateral.shib.ilk; // e.g. 'SHIB-A'

  console.log('USDog Liquidation Watcher starting...');
  console.log('Dog:', dogAddress);
  console.log('FlashLiquidator:', flashAddr);
  console.log('Wallet:', wallet.address);

  // Keep simple dedupe for tx bursts
  const processedIds = new Set();

  // Subscribe to Bark events
  dog.on('Bark', async (ilk, urn, ink, art, due, clip, id, event) => {
    try {
      const idStr = id.toString();
      if (processedIds.has(idStr)) return;
      processedIds.add(idStr);

      let ilkSymbol;
      try { ilkSymbol = ethers.decodeBytes32String(ilk); } catch (_) { ilkSymbol = null; }

      if (!ilkSymbol) {
        // Fallback: match against known ILKs by comparing to encoded constants
        const dogeBytes = ethers.encodeBytes32String(dogeIlk);
        const shibBytes = ethers.encodeBytes32String(shibIlk);
        if (ilk.toLowerCase() === dogeBytes.toLowerCase()) ilkSymbol = dogeIlk;
        if (ilk.toLowerCase() === shibBytes.toLowerCase()) ilkSymbol = shibIlk;
      }

      if (ilkSymbol !== dogeIlk && ilkSymbol !== shibIlk) {
        return; // Not our ILKs
      }

      const pool = getFlashPoolForIlk(ilkSymbol, mainnet);
      if (!pool) {
        console.warn(`No flash pool configured for ${ilkSymbol}. Skipping auction ${idStr}.`);
        return;
      }

      // due is expected to be [rad]; liquidator expects repayAmount in rad
      const repayAmount = due;

      console.log(`New liquidation detected: ${ilkSymbol}`);
      console.log(` - urn: ${urn}`);
      console.log(` - due(rad): ${repayAmount.toString()}`);
      console.log(` - auction id: ${idStr}`);
      console.log(` - pool: ${pool}`);

      const gasPrice = ethers.parseUnits(process.env.MAX_GAS_PRICE_GWEI || '25', 'gwei');

      const tx = await liquidator.liquidateMemeCollateral(
        urn,
        ethers.ZeroAddress,
        ethers.ZeroAddress,
        repayAmount,
        pool,
        { gasPrice, gasLimit: 2_000_000 }
      );
      console.log('Liquidation tx sent:', tx.hash);
      const rcpt = await tx.wait();
      console.log('Liquidation tx status:', rcpt.status === 1 ? 'success' : 'failed');
    } catch (err) {
      console.error('Error handling Bark event:', err && err.message ? err.message : err);
    }
  });

  // Keep process alive
  process.on('SIGINT', () => process.exit(0));
  process.on('SIGTERM', () => process.exit(0));
}

main().catch((e) => {
  console.error('Watcher crashed:', e && e.message ? e.message : e);
  process.exit(1);
});

