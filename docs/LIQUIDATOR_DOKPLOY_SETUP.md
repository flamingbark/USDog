# USDog Flash Liquidator — Dokploy on VPS Setup

This guide shows how to run the automated USDog flash liquidator as a long‑running background worker on a VPS using Dokploy. It deploys the on‑chain liquidation watcher (`scripts/usdog-liquidation-watcher.js`) that listens for Dog `Bark` events and executes `liquidateMemeCollateral(...)` via the deployed `FlashLiquidator` contract.

## Overview

- What you get: a single container that runs the watcher continuously with your bot key, capped gas price, and network endpoints.
- Safe defaults: no web port is exposed; only outbound RPC calls are made.
- Rollout model: push to your repo main branch and redeploy from Dokploy, or let Dokploy build from a Dockerfile.

## Prerequisites

- A VPS with Docker installed and Dokploy set up (reverse proxy/SSL for dashboard).
- Git access to this repository (or a fork) from your Dokploy instance.
- The contracts are already deployed and verified; you have:
  - `FlashLiquidator` address: use `deployments/flash-liquidator.json:1`.
  - BSC RPC endpoint (HTTPS) with sufficient rate limits.
  - The bot private key (same one used for deployment if you choose) funded with a small amount of BNB for gas.

## Environment variables (required)

- `PRIVATE_KEY` — Bot key that will send liquidation txs. Keep this secret.
- `BSC_RPC_URL` — e.g. `https://bsc-dataseed1.binance.org/`
- `MAX_GAS_PRICE_GWEI` — e.g. `5` to keep costs down, or higher if needed.
- `FLASH_LIQUIDATOR` — Optional. If not provided, the watcher uses `deployments/flash-liquidator.json:1`.

Optional:

- `BSCSCAN_API_KEY` for verification tasks (not required to run the watcher).
- `BSC_WSS_URL` not needed for server mode; the watcher uses HTTP polling by default.

## Important note about Node module format

This repo’s `package.json` sets `"type": "module"`. The watcher (`scripts/usdog-liquidation-watcher.js`) uses CommonJS `require(...)`. To run it in production without changing repo files, this guide’s Dockerfile copies the file to a `.cjs` sibling at build time and runs that. This avoids ESM/CJS conflicts.

## Option A — Deploy via Dockerfile (recommended)

1) Create a Dockerfile in the project root (or use the snippet below via your Git provider build step):

```
# Dockerfile
FROM node:20-alpine AS base
WORKDIR /app

# Install only what we need to run scripts
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Ensure the watcher runs under CommonJS despite "type": "module"
RUN cp scripts/usdog-liquidation-watcher.js scripts/usdog-liquidation-watcher.cjs

# Use production env for Node and smaller images
ENV NODE_ENV=production

# No ports exposed; this is a worker, not a web service
CMD ["node", "scripts/usdog-liquidation-watcher.cjs"]
```

2) In Dokploy dashboard:

- Add Project → Add Application → “Dockerfile”
- Repository: point to this repo (or your fork) and branch.
- Context/Path: root of repo (where Dockerfile lives).
- Build & Deploy.

3) Configure environment variables in Dokploy (Application → Settings → Environment):

- `PRIVATE_KEY=0x...` (same key used for deployment if desired)
- `BSC_RPC_URL=https://bsc-dataseed1.binance.org/`
- `MAX_GAS_PRICE_GWEI=5` (adjust if transactions are slow to confirm)
- `FLASH_LIQUIDATOR=0x1F440fB7dab4D3b27617f8e5b4855B476FDd95a2` (or omit to use deployments file)

4) Scale to 1 replica (Application → Scaling). No HTTP/port configuration needed.

5) Deploy. View logs to confirm startup:

- You should see lines like:
  - `USDog Liquidation Watcher starting...`
  - `Dog: 0x...`
  - `FlashLiquidator: 0x...`
  - `Wallet: 0x...`

## Option B — Buildpack/Node preset (without Dockerfile)

If you use a Node preset instead of a Dockerfile, set the Start Command to:

```
sh -lc "cp scripts/usdog-liquidation-watcher.js scripts/usdog-liquidation-watcher.cjs && node scripts/usdog-liquidation-watcher.cjs"
```

Then add the same environment variables as above. This reproduces the CommonJS shim that the Dockerfile provides.

## Updating the service

- Change configuration (env vars) → redeploy in Dokploy.
- Update code in repo → Dokploy will rebuild and restart on next deploy.

## Health and reliability

- Dokploy restarts the container on exit. The watcher handles transient RPC errors by failing the current event but staying subscribed.
- Keep `MAX_GAS_PRICE_GWEI` realistic for mainnet. If too low, txs may stall; raise gradually to meet current network conditions.

## Security best practices

- Use a dedicated bot key with only enough BNB for operations; do not reuse your personal wallet.
- Store secrets only in Dokploy’s environment variables or its secrets manager; never commit to the repo.
- Restrict dashboard access and enable HTTPS for Dokploy.

## Troubleshooting

- `require is not defined` on startup: ensure you’re running the `.cjs` copy as shown above.
- `insufficient funds for gas * price + value`: top up the bot key in BNB or lower `MAX_GAS_PRICE_GWEI`.
- No liquidations are sent: verify `deployments/mainnet-addresses.json:1` flash loan pools (`DOGE-WBNB`, `SHIB-WBNB`), `Dog` address, and that `FlashLiquidator` is deployed and configured.

## References

- Watcher entrypoint: `scripts/usdog-liquidation-watcher.js:1`
- Liquidator contract address: `deployments/flash-liquidator.json:1`
- Core addresses and pools: `deployments/mainnet-addresses.json:1`

