import { promises as fs } from 'fs';
import path from 'path';
import Link from 'next/link';

type MainnetAddresses = {
  network: string;
  core: Record<string, string>;
  collateral: {
    doge: { token: string; join: string; priceFeed: string; clipper: string; ilk: string };
    shib: { token: string; join: string; priceFeed: string; clipper: string; ilk: string };
  };
  liquidation: { calc: string };
  external: { pancakeRouter: string; pancakeFactory: string; wbnb: string };
};

type AllContracts = MainnetAddresses & {
  liquidation: MainnetAddresses['liquidation'] & { flashLiquidator?: string };
};

const bscscan = (addr: string) => `https://bscscan.com/address/${addr}`;
const bscscanCode = (addr: string) => `${bscscan(addr)}#code`;

async function readJson<T>(rel: string): Promise<T> {
  const file = path.join(process.cwd(), 'public', 'deployments', rel);
  const data = await fs.readFile(file, 'utf8');
  return JSON.parse(data) as T;
}

export default async function ContractsPage() {
  const mainnet = await readJson<MainnetAddresses>('mainnet-addresses.json');
  const all = await readJson<AllContracts>('all-contracts.json');
  const flash = await readJson<{ flashLiquidator: string }>('flash-liquidator.json');
  const disabled = true;

  const core = mainnet.core;
  const col = mainnet.collateral;

  const items: { section: string; entries: { name: string; address: string }[] }[] = [
    {
      section: 'Core',
      entries: [
        { name: 'Vat', address: core.vat },
        { name: 'Spot', address: core.spot },
        { name: 'Stablecoin (USDog)', address: core.stablecoin },
        { name: 'DaiJoin', address: core.daiJoin },
        { name: 'Dog', address: core.dog },
        { name: 'Vow', address: core.vow },
        { name: 'Jug', address: core.jug },
        { name: 'Pot', address: core.pot },
        { name: 'End', address: core.end },
        { name: 'Multicall', address: core.multicall },
      ],
    },
    {
      section: 'Collateral — DOGE',
      entries: [
        { name: 'DOGE Token', address: col.doge.token },
        { name: 'DOGE Join', address: col.doge.join },
        { name: 'DOGE Price Feed', address: col.doge.priceFeed },
        { name: 'DOGE Clipper', address: col.doge.clipper },
      ],
    },
    {
      section: 'Collateral — SHIB',
      entries: [
        { name: 'SHIB Token', address: col.shib.token },
        { name: 'SHIB Join', address: col.shib.join },
        { name: 'SHIB Price Feed', address: col.shib.priceFeed },
        { name: 'SHIB Clipper', address: col.shib.clipper },
      ],
    },
    {
      section: 'Liquidation',
      entries: [
        { name: 'Price Decrease Calc', address: mainnet.liquidation.calc },
        { name: 'FlashLiquidator', address: all.liquidation.flashLiquidator || flash.flashLiquidator },
      ],
    },
    {
      section: 'External',
      entries: [
        { name: 'Pancake Router', address: mainnet.external.pancakeRouter },
        { name: 'Pancake Factory', address: mainnet.external.pancakeFactory },
        { name: 'WBNB', address: mainnet.external.wbnb },
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-2 text-3xl font-bold">Deployed Contracts (BSC)</h1>
      {disabled && (
        <p className="mb-8 text-red-600">
          Note: These contracts are temporarily disabled and will be redeployed once DAO membership is finalized.
        </p>
      )}
      <p className="mb-8 text-muted-foreground">All relevant contracts for the USDog system with quick links to BscScan.</p>
      <div className="space-y-8">
        {items.map((sec) => (
          <div key={sec.section}>
            <h2 className="mb-3 text-xl font-semibold">{sec.section}</h2>
            <div className="divide-y rounded-md border">
              {sec.entries.map((e) => (
                <div key={e.name} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <div className="font-medium">{e.name}</div>
                    <div className="truncate text-sm text-muted-foreground">{e.address}</div>
                  </div>
                  <div className="shrink-0 space-x-2">
                    <Link href={bscscan(e.address)} target="_blank" className="text-primary underline">BscScan</Link>
                    <Link href={bscscanCode(e.address)} target="_blank" className="text-primary underline">Code</Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
