const { task } = require("hardhat/config");
const { HardhatUserConfig } = require("hardhat/types");

// Task: Deploy contracts
task("deploy-all", "Deploy all contracts")
  .addOptionalParam("pausers", "Number of pausers", "1")
  .setAction(async (taskArgs, hre) => {
    console.log("Deploying all contracts...");
    await hre.run("deploy");
    console.log("Deployment complete!");
  });

// Task: Verify contracts
task("verify-all", "Verify all deployed contracts")
  .addParam("address", "Contract address to verify")
  .setAction(async (taskArgs, hre) => {
    console.log(`Verifying contract at ${taskArgs.address}...`);
    await hre.run("verify:verify", {
      address: taskArgs.address,
    });
  });

// Task: Get contract info
task("contract-info", "Get deployed contract information")
  .addParam("address", "Contract address")
  .setAction(async (taskArgs, hre) => {
    const PrivateForexTrading = await hre.ethers.getContractAt(
      "PrivateForexTrading",
      taskArgs.address
    );

    console.log("\n=== Contract Information ===");
    console.log("Address:", taskArgs.address);
    console.log("Owner:", await PrivateForexTrading.owner());
    console.log("Paused:", await PrivateForexTrading.paused());
    console.log("MIN_DEPOSIT:", (await PrivateForexTrading.MIN_DEPOSIT()).toString());
    console.log("MAX_LEVERAGE:", (await PrivateForexTrading.MAX_LEVERAGE()).toString());
  });

// Task: Check pauser set
task("check-pausers", "Check PauserSet configuration")
  .addParam("address", "PauserSet contract address")
  .setAction(async (taskArgs, hre) => {
    const PauserSet = await hre.ethers.getContractAt("PauserSet", taskArgs.address);

    const pauserCount = await PauserSet.getPauserCount();
    console.log("\n=== Pauser Set Information ===");
    console.log("Total Pausers:", pauserCount.toString());

    for (let i = 0; i < pauserCount; i++) {
      const pauser = await PauserSet.getPauserAt(i);
      console.log(`Pauser ${i}:`, pauser);
    }
  });

// Task: Test encryption
task("test-encryption", "Test FHE encryption/decryption")
  .addParam("value", "Value to encrypt")
  .setAction(async (taskArgs, hre) => {
    console.log("\n=== Testing FHE Encryption ===");
    console.log("Original value:", taskArgs.value);
    // In real implementation, this would use fhevmjs
    console.log("Note: This is a placeholder. Use fhevmjs for actual encryption.");
  });

module.exports = {};
