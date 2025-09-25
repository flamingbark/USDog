export default function DocsPage() {
  return (
    <main className="min-h-screen bg-[#f3f1f7]">
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-4xl font-bold mb-4">USDog Codebase Documentation</h1>
        <p className="text-muted-foreground mb-8">
          Comprehensive overview of smart contracts, deployment scripts, subgraph, and frontends.
        </p>
        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-3">Table of Contents</h2>

          <div className="mb-4 rounded-xl border border-border bg-card p-4">
            <h3 className="text-lg font-semibold mb-2">Generated API Docs (Doxygen)</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Full, auto-generated documentation of contracts, scripts, frontend, and subgraph code.
            </p>
            <a
              href="/doxygen/html/index.html"
              className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:opacity-90"
            >
              Open API Reference
            </a>
          </div>

          <ol className="list-decimal list-inside space-y-1">
            <li><a href="#structure" className="text-primary underline">Repository Structure</a></li>
            <li><a href="#contracts" className="text-primary underline">Smart Contracts</a></li>
            <li><a href="#flows" className="text-primary underline">System Flows</a></li>
            <li><a href="#deployment" className="text-primary underline">Deployment & Scripts</a></li>
            <li><a href="#subgraph" className="text-primary underline">Subgraph</a></li>
            <li><a href="#frontend" className="text-primary underline">Frontends</a></li>
            <li><a href="#config" className="text-primary underline">Configuration</a></li>
            <li><a href="#dev" className="text-primary underline">Developer Guide</a></li>
            <li><a href="#troubleshooting" className="text-primary underline">Troubleshooting</a></li>
            <li><a href="#glossary" className="text-primary underline">Glossary</a></li>
          </ol>
        </section>

        <section id="structure" className="mb-12">
          <h2 className="text-2xl font-semibold mb-3">Repository Structure</h2>
          <p className="mb-2">At the root, this monorepo contains Solidity smart contracts, deployment scripts, a subgraph, and two frontends.</p>
          <ul className="list-disc list-inside space-y-1">
            <li><code>contracts/</code> — Core protocol contracts (Maker-like: Vat, Spot, Dog, Clip, Jug, Vow, End, Pot, StableCoin, Join, PriceFeed, Calc, Multicall).</li>
            <li><code>scripts/</code> — Hardhat scripts for deployment, configuration, and end-to-end test flows.</li>
            <li><code>usdog/</code> — The Graph subgraph for indexing on-chain data.</li>
            <li><code>frontendnew/</code> — Next.js app (current UI) with RainbowKit and shadcn/ui.</li>
            <li><code>frontend/</code> — Legacy React app (kept for reference).</li>
            <li><code>test/</code> — Mocha/Chai tests for contracts.</li>
            <li><code>deployments/</code> — Stored addresses from deployments per network.</li>
          </ul>
        </section>

        <section id="contracts" className="mb-12">
          <h2 className="text-2xl font-semibold mb-3">Smart Contracts</h2>
          <p className="mb-2">USDog is a collateralized debt position (CDP) system inspired by MakerDAO. Key components:</p>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>StableCoin.sol</strong> — ERC-20 stablecoin minted/burned via joins and Vat.</li>
            <li><strong>Vat.sol</strong> — Core accounting: collateral/debt balances, urns, ilks, system-wide line/dust, move/frob.</li>
            <li><strong>Spot.sol</strong> — Collateral risk config and price feeds; sets safe collateralization via <code>mat</code>.</li>
            <li><strong>Dog.sol</strong> — Liquidation keeper that starts auctions when vaults are unsafe; interfaces <em>Clip</em>.</li>
            <li><strong>Clip.sol</strong> — Dutch auctions for liquidations with price decay via <em>Calc</em>.</li>
            <li><strong>Calc.sol</strong> — Price decay algorithms used by Clip (exponential, linear, stairstep).</li>
            <li><strong>Jug.sol</strong> — Stability fees (per-ilk duty) accruing over time.</li>
            <li><strong>Vow.sol</strong> — System surplus/deficit management; triggers Flap/Flop in full systems.</li>
            <li><strong>End.sol</strong> — Global settlement (emergency shutdown).</li>
            <li><strong>Pot.sol</strong> — Savings rate (DSR) for idle stablecoin deposits.</li>
            <li><strong>Join.sol</strong> — Adapters: GemJoin for collateral, DaiJoin for stablecoin.</li>
            <li><strong>PriceFeed.sol</strong> — Price oracles (Chainlink, API3, custom Doge/Shib feeders, medianizer).</li>
            <li><strong>Multicall.sol</strong> — Batch calls utility.</li>
            <li><strong>mocks/</strong> — Mock tokens and auctions for local testing.</li>
          </ul>
          <p className="mt-3">Support libraries: <strong>lib/DSMath.sol</strong> for fixed-point math and safety.</p>

          <h3 className="text-xl font-semibold mt-6 mb-2">Data Model Highlights (Vat)</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Urn: per-user, per-ilk position tracking collateral and debt.</li>
            <li>Ilk: per-collateral risk params — debt ceiling (line), min debt (dust), rate, spot, mat.</li>
            <li>System-wide: live flag, debt totals, global ceilings.</li>
          </ul>

          <h3 className="text-xl font-semibold mt-6 mb-2">Risk & Oracles (Spot/PriceFeed)</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Each collateral uses a <em>pip</em> (price feed) configured via Spot to compute <code>spot</code>.</li>
            <li>Maintainers update oracles via scripts (API3, Chainlink, or median feeds).</li>
            <li>Changing <code>mat</code> adjusts liquidation ratio; <code>doc</code> configures stablecoin debt parameters.</li>
          </ul>

          <h3 className="text-xl font-semibold mt-6 mb-2">Liquidations (Dog/Clip/Calc)</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Dog checks safety; when unsafe, starts a Clip auction against the urn.</li>
            <li>Clip runs a price-decaying auction; bidders buy collateral to cover debt + penalty.</li>
            <li>Calc defines the price step-down curve; parameters are set per-ilk.</li>
          </ul>

          <h3 className="text-xl font-semibold mt-6 mb-2">Fees & Savings (Jug/Pot)</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Jug accrues stability fee into the debt over time via rate increases.</li>
            <li>Pot pays DSR to savers from system surplus; interacts with Vow for accounting.</li>
          </ul>

          <h3 className="text-xl font-semibold mt-6 mb-2">Global Settlement (End)</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Emergency process to freeze the system, allowing users to reclaim collateral or stablecoin pro-rata.</li>
          </ul>
        </section>

        <section id="flows" className="mb-12">
          <h2 className="text-2xl font-semibold mb-3">System Flows</h2>
          <h3 className="text-xl font-semibold mt-4 mb-2">Open Vault, Deposit, Mint</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>User approves GemJoin for collateral token.</li>
            <li>User deposits collateral via GemJoin; Vat records ink.</li>
            <li>User frobs to generate debt; DaiJoin mints StableCoin to user.</li>
          </ol>
          <h3 className="text-xl font-semibold mt-4 mb-2">Repay and Withdraw</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>User approves DaiJoin; burns StableCoin to reduce debt.</li>
            <li>When safe, user withdraws collateral via GemJoin.</li>
          </ol>
          <h3 className="text-xl font-semibold mt-4 mb-2">Liquidation</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>Price drops; vault becomes unsafe based on <code>spot</code> and <code>mat</code>.</li>
            <li>Dog kicks an auction in Clip; bidders purchase collateral.</li>
            <li>Debt gets covered; leftover collateral and proceeds settle via Vow.</li>
          </ol>
        </section>

        <section id="deployment" className="mb-12">
          <h2 className="text-2xl font-semibold mb-3">Deployment & Scripts</h2>
          <p className="mb-2">Hardhat scripts in <code>scripts/</code> handle end-to-end setup and testing.</p>
          <ul className="list-disc list-inside space-y-1">
            <li><code>deploy.js</code> — Deploys core contracts, joins, and oracles.</li>
            <li><code>configure-system*.js</code> — Configures ilks, risk params, and permissions.</li>
            <li><code>test-*.js</code> — Scenario scripts for CDP open/mint/repay, liquidations, etc.</li>
            <li><code>update-price-feeds.js</code> — Oracle pokes/updates.</li>
            <li><code>verify-contracts.js</code> — Etherscan or block explorer verifications.</li>
          </ul>
          <p className="mt-2">Deployment results are written to <code>deployments/*.json</code> and consumed by frontends.</p>
        </section>

        <section id="subgraph" className="mb-12">
          <h2 className="text-2xl font-semibold mb-3">Subgraph</h2>
          <p className="mb-2">The <code>usdog/</code> package defines a Graph Protocol subgraph that indexes StableCoin, Vat, and Dog/Clip events.</p>
          <ul className="list-disc list-inside space-y-1">
            <li><code>schema.graphql</code> — Entity definitions for vaults, auctions, and protocol metrics.</li>
            <li><code>subgraph.yaml</code> — Event sources and mappings configuration.</li>
            <li><code>src/mapping.ts</code> — Event handlers that maintain derived entities.</li>
          </ul>
        </section>

        <section id="frontend" className="mb-12">
          <h2 className="text-2xl font-semibold mb-3">Frontends</h2>
          <h3 className="text-xl font-semibold mt-4 mb-2">Next.js App (frontendnew)</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Wallet integration via RainbowKit in <code>src/components/providers.tsx</code> and <code>src/lib/wagmi.ts</code>.</li>
            <li>Contract addresses and ABIs configured in <code>src/lib/contracts.ts</code>.</li>
            <li>Key pages: <code>/</code>, <code>/vaults</code>, <code>/vaults/open</code>, <code>/stake</code>.</li>
            <li>UI primitives via shadcn/ui in <code>src/components/ui/*</code>.</li>
          </ul>
          <h3 className="text-xl font-semibold mt-4 mb-2">Legacy React App (frontend)</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Contains earlier dashboard, CDP management, and liquidation views.</li>
            <li>Uses wagmi configuration under <code>src/config/wagmi.ts</code> and contract hooks.</li>
          </ul>
        </section>

        <section id="config" className="mb-12">
          <h2 className="text-2xl font-semibold mb-3">Configuration</h2>
          <ul className="list-disc list-inside space-y-1">
            <li><code>.env</code> and <code>.env.local</code> — RPC URLs, private keys, subgraph endpoints.</li>
            <li><code>hardhat.config.js</code> — Networks and compiler settings for Solidity.</li>
            <li><code>deployments/*.json</code> — Resolved on frontend via <code>contracts.ts</code>.</li>
            <li>Price feed settings in scripts and <code>PriceFeed.sol</code> implementations.</li>
          </ul>
        </section>

        <section id="dev" className="mb-12">
          <h2 className="text-2xl font-semibold mb-3">Developer Guide</h2>
          <h3 className="text-xl font-semibold mt-4 mb-2">Run the frontend</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>From repo root: <code>npm run dev</code> (spawns frontendnew).</li>
            <li>Alternatively: <code>cd frontendnew && npm run dev</code>.</li>
          </ol>
          <h3 className="text-xl font-semibold mt-4 mb-2">Deploy & configure</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>Run <code>node scripts/deploy.js</code> to deploy contracts.</li>
            <li>Run configuration scripts (e.g., <code>scripts/configure-system-final.js</code>).</li>
            <li>Update <code>frontendnew/src/lib/contracts.ts</code> with deployed addresses if not auto-written.</li>
            <li>Verify addresses in <code>deployments/*.json</code>.</li>
          </ol>
          <h3 className="text-xl font-semibold mt-4 mb-2">Testing flows</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Scripted E2E: <code>scripts/test-full-cdp.js</code>, <code>scripts/test-liquidations.js</code>, and variants.</li>
            <li>Unit tests: <code>test/Stablecoin.test.js</code>.</li>
          </ul>
        </section>

        <section id="troubleshooting" className="mb-12">
          <h2 className="text-2xl font-semibold mb-3">Troubleshooting</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Oracles not updating: run <code>scripts/update-price-feeds.js</code>, check API3/Chainlink config.</li>
            <li>Vault actions revert: ensure approvals to GemJoin/DaiJoin; check <code>mat</code>, <code>dust</code>, and <code>line</code> limits.</li>
            <li>Liquidations stuck: verify Dog/Clip permissions and Calc parameters.</li>
            <li>Address mismatches: reconcile <code>deployments/*.json</code> with <code>frontendnew/src/lib/contracts.ts</code>.</li>
          </ul>
        </section>

        <section id="glossary" className="mb-12">
          <h2 className="text-2xl font-semibold mb-3">Glossary</h2>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Ilk</strong> — Collateral type configuration.</li>
            <li><strong>Urn</strong> — User vault data structure.</li>
            <li><strong>Frob</strong> — Adjust collateral and debt.</li>
            <li><strong>Mat</strong> — Liquidation ratio.</li>
            <li><strong>Spot</strong> — Risk-adjusted price.</li>
            <li><strong>Dust</strong> — Minimum debt size.</li>
            <li><strong>Line</strong> — Debt ceiling (per-ilk or global).</li>
          </ul>
        </section>

        <footer className="mt-16 text-sm text-muted-foreground">
          Last updated: {new Date().toISOString().slice(0, 10)}
        </footer>
      </div>
    </main>
  );
}