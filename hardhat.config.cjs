require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-verify");
const { config } = require("dotenv");
config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.19",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          },
          viaIR: true
        }
      },
      {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    ],
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true
    }
  },
  networks: {
    hardhat: {
      type: "edr-simulated",
      chainId: 1337
    },
    localhost: {
      type: "http",
      url: "http://127.0.0.1:8545"
    },
    bsc: {
      type: "http",
      url: process.env.BSC_RPC_URL || "https://bsc-dataseed1.binance.org/",
      chainId: 56,
      gasPrice: 15000000000, // Reduced from 20 to 15 gwei
      gas: 2000000, // Set explicit gas limit
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    bscTestnet: {
      type: "http",
      url: process.env.BSC_TESTNET_RPC_URL || "https://data-seed-prebsc-1-s1.binance.org:8545/",
      chainId: 97,
      gasPrice: 20000000000,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    }
  },
  etherscan: {
    apiKey: process.env.BSCSCAN_API_KEY || "3FBKFF8AXVXFCG3QHD5K2S6J7UYTKIEM5C",
    customChains: [
      {
        network: "bsc",
        chainId: 56,
        urls: {
          apiURL: "https://api.bscscan.com/api",
          browserURL: "https://bscscan.com"
        }
      }
    ]
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};