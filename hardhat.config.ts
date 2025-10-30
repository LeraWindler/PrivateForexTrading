import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@typechain/hardhat";
import "hardhat-deploy";
import "hardhat-contract-sizer";
import "@fhevm/hardhat-plugin";
import * as dotenv from "dotenv";
import "./tasks";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
        details: {
          yul: true,
          yulDetails: {
            stackAllocation: true,
            optimizerSteps: "dhfoDgvulfnTUtnIf"
          }
        }
      },
      evmVersion: "cancun",
      metadata: {
        bytecodeHash: "none"
      },
      outputSelection: {
        "*": {
          "*": ["evm.bytecode", "evm.deployedBytecode", "abi", "metadata"]
        }
      }
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    localfhenix: {
      url: process.env.LOCAL_FHENIX_URL || "http://127.0.0.1:8545",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 8008,
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
    },
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    trader1: {
      default: 1,
    },
    trader2: {
      default: 2,
    },
    pauser: {
      default: 3,
    },
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true,
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    outputFile: "gas-report.txt",
    noColors: false,
    showTimeSpent: true,
    showMethodSig: true,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    token: "ETH",
    gasPriceApi: process.env.GAS_PRICE_API,
    excludeContracts: [],
    src: "./contracts"
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
    deploy: "./deploy",
  },
  mocha: {
    timeout: 100000,
  },
};

export default config;
