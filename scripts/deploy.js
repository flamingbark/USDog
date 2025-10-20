import hre from "hardhat";
import fs from "node:fs";
import path from "node:path";

async function main() {
  const { ethers, network } = hre;
  const net = await ethers.provider.getNetwork();
  const chainId = Number(net.chainId);

  const root = process.cwd();
  const mainnetPath = path.join(root, "deployments", "mainnet-addresses.json");

  console.log("USDog deploy helper");
  console.log("Network:", network.name, "chainId:", chainId);

  if (fs.existsSync(mainnetPath)) {
    const deployed = JSON.parse(fs.readFileSync(mainnetPath, "utf8"));
    console.log("Existing BSC mainnet deployment detected:");
    console.log(JSON.stringify(deployed.core, null, 2));
    console.log("Collateral:");
    console.log(JSON.stringify(deployed.collateral, null, 2));
  }

  if (network.name === "hardhat" || network.name === "localhost" || chainId === 31337 || chainId === 1337) {
    console.log("Local dev network detected.");
    console.log("Contracts are already deployed on BSC mainnet; this script does not re-deploy.");
    console.log("Use tests or custom scripts under scripts/ for local behavior.");
    return;
  }

  console.log("Non-local network detected (", network.name, ")");
  console.log("Contracts are already deployed. No action taken. See deployments/mainnet-addresses.json.");
}

main().catch((err) => {
  console.error("Deploy script error:", err);
  process.exit(1);
});

