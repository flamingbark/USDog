// Simple consistency check between frontend address map and deployments JSON
// Usage: node scripts/validate-frontend-addresses.cjs

const path = require('path');
const fs = require('fs');

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function main() {
  const root = process.cwd();
  const deploymentsPath = path.join(root, 'deployments', 'mainnet-addresses.json');
  const contractsTsPath = path.join(root, 'frontendnew', 'src', 'lib', 'contracts.ts');

  const deployments = loadJson(deploymentsPath);
  const src = fs.readFileSync(contractsTsPath, 'utf8');

  const bsc = deployments.core;
  const coll = deployments.collateral;

  // naive extraction from TS file using regex (keeps this script dependency-free)
  function extractAddress(key) {
    const re = new RegExp('^\\s*' + key + ":\\s*\"(0x[0-9a-fA-F]{40})\"", 'm');
    const m = src.match(re);
    return m ? m[1] : null;
  }

  const checks = [
    ['vat', bsc.vat, extractAddress('vat')],
    ['stablecoin', bsc.stablecoin, extractAddress('stablecoin')],
    ['spot', bsc.spot, extractAddress('spot')],
    ['daiJoin', bsc.daiJoin, extractAddress('daiJoin')],
    ['multicall', bsc.multicall, extractAddress('multicall')],
    ['pot', bsc.pot, extractAddress('pot')],
    ['dogeJoin', coll.doge.join, extractAddress('dogeJoin')],
    ['shibJoin', coll.shib.join, extractAddress('shibJoin')],
  ];

  let ok = true;
  for (const [name, expected, actual] of checks) {
    if (!expected || !actual) {
      console.log(`[WARN] ${name}: missing expected or actual (expected=${expected}, actual=${actual})`);
      continue;
    }
    if (expected.toLowerCase() !== actual.toLowerCase()) {
      ok = false;
      console.log(`[MISMATCH] ${name}: expected ${expected}, found ${actual}`);
    } else {
      console.log(`[OK] ${name}: ${actual}`);
    }
  }

  process.exit(ok ? 0 : 1);
}

main();
