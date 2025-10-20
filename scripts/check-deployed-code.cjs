// Verify deployed contract addresses on BSC have bytecode and basic callable interfaces.
// Usage: node scripts/check-deployed-code.cjs

const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

const BSC_RPC = process.env.BSC_RPC_URL || 'https://bsc-dataseed1.binance.org/';

const ERC20_ABI = [
  { inputs: [], name: 'name', outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'decimals', outputs: [{ type: 'uint8' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'totalSupply', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
];

const DAI_JOIN_ABI = [
  { inputs: [], name: 'vat', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'dai', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'live', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
];

async function main() {
  const root = process.cwd();
  const deploymentsPath = path.join(root, 'deployments', 'mainnet-addresses.json');
  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));

  const provider = new ethers.JsonRpcProvider(BSC_RPC, 56, { staticNetwork: true });

  const core = deployments.core;
  const coll = deployments.collateral;

  async function checkCode(label, addr) {
    const code = await provider.getCode(addr);
    const ok = code && code !== '0x';
    console.log(`${label}: ${addr} -> ${ok ? `OK (len=${code.length})` : 'NO CODE'}`);
    return ok;
  }

  let allOk = true;
  // Core contracts
  for (const [k, v] of Object.entries(core)) {
    const ok = await checkCode(`core.${k}`, v);
    allOk = allOk && ok;
  }

  // Collateral joins and clippers
  for (const [k, c] of Object.entries(coll)) {
    const ok1 = await checkCode(`collateral.${k}.join`, c.join);
    const ok2 = await checkCode(`collateral.${k}.priceFeed`, c.priceFeed);
    const ok3 = await checkCode(`collateral.${k}.clipper`, c.clipper);
    allOk = allOk && ok1 && ok2 && ok3;
  }

  // Probe StableCoin ERC20 interface
  try {
    const stablecoin = new ethers.Contract(core.stablecoin, ERC20_ABI, provider);
    const [name, decimals] = await Promise.all([stablecoin.name(), stablecoin.decimals()]);
    console.log(`StableCoin: name=${name}, decimals=${decimals}`);
  } catch (e) {
    console.log('StableCoin probe failed:', e?.message || e);
    allOk = false;
  }

  // Probe DaiJoin interface
  try {
    const daiJoin = new ethers.Contract(core.daiJoin, DAI_JOIN_ABI, provider);
    const [vat, dai, live] = await Promise.all([daiJoin.vat(), daiJoin.dai(), daiJoin.live()]);
    console.log(`DaiJoin: vat=${vat}, dai=${dai}, live=${live}`);
  } catch (e) {
    console.log('DaiJoin probe failed:', e?.message || e);
    allOk = false;
  }

  if (!allOk) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

