import { readFileSync } from 'fs';
import { join } from 'path';
import { ethers } from 'ethers';

async function main(){
  const root = process.cwd();
  const artPath = join(root, 'artifacts', 'contracts', 'FlashLiquidator.sol', 'FlashLiquidator.json');
  const artifact = JSON.parse(readFileSync(artPath,'utf8'));
  const addresses = JSON.parse(readFileSync(join(root,'deployments','mainnet-addresses.json'),'utf8'));
  const vat = addresses.core.vat;
  const daiJoin = addresses.core.daiJoin;

  const provider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/');
  const wallet = (process.env.PRIVATE_KEY ? new ethers.Wallet(process.env.PRIVATE_KEY, provider) : ethers.Wallet.createRandom().connect(provider));

  const iface = new ethers.Interface(artifact.abi);
  const deployData = artifact.bytecode + iface.encodeDeploy([vat, daiJoin]).slice(2);

  const tx = {
    from: wallet.address,
    data: deployData,
  };
  const gas = await provider.estimateGas(tx);
  const fee = await provider.getFeeData();
  const gasPrice = fee.gasPrice ?? ethers.parseUnits('15','gwei');
  const costWei = gas * gasPrice;
  const bnb = Number(ethers.formatEther(costWei));

  // Rough config costs: ~200k gas total at same gasPrice
  const configGas = 200000n;
  const configCostWei = configGas * gasPrice;
  const totalWei = costWei + configCostWei;

  console.log(JSON.stringify({
    deployGas: gas.toString(),
    gasPrice: gasPrice.toString(),
    deployBNB: bnb,
    configGas: configGas.toString(),
    totalBNB: Number(ethers.formatEther(totalWei))
  }, null, 2));
}

main().catch(e=>{ console.error(e); process.exit(1); });
