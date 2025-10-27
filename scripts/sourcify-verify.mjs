import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import https from 'https';

function findBuildInfo(root){
  const dir = join(root,'artifacts','build-info');
  const files = readdirSync(dir).filter(f=>f.endsWith('.json'));
  if (files.length === 0) throw new Error('No build-info found');
  // pick the most recent by mtime order would be better, but keep simple
  return join(dir, files[files.length-1]);
}

function postJson(url, data){
  return new Promise((resolve, reject)=>{
    const body = JSON.stringify(data);
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res=>{
      let out='';
      res.on('data', d=> out+=d);
      res.on('end', ()=>{
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) return resolve({status: res.statusCode, body: out});
        reject(new Error(`HTTP ${res.statusCode}: ${out}`));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main(){
  const root = process.cwd();
  const flash = JSON.parse(readFileSync(join(root,'deployments','flash-liquidator.json'),'utf8'));
  const address = (process.env.FLASH_LIQUIDATOR || flash.flashLiquidator);
  const chain = process.env.CHAIN_ID || '56';

  const buildInfoPath = findBuildInfo(root);
  const build = JSON.parse(readFileSync(buildInfoPath,'utf8'));
  const input = build.input; // standard json input

  // Ensure DSMath is present; Sourcify expects exact paths
  if (!input.sources['contracts/lib/DSMath.sol']){
    // Load from FS if missing in this build (should not happen, but safe)
    const dsmath = readFileSync(join(root,'contracts','lib','DSMath.sol'),'utf8');
    input.sources['contracts/lib/DSMath.sol'] = { content: dsmath };
  }

  const payload = {
    address,
    chain,
    // format: file path + ':' + contract name
    contractName: 'contracts/FlashLiquidator.sol:FlashLiquidator',
    files: input.sources
  };

  const res = await postJson('https://sourcify.dev/server/verify/solidity-json', payload);
  console.log(res.body);
}

main().catch(e=>{ console.error(e.message || e); process.exit(1); });

