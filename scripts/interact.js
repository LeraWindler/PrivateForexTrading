const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("\n🎮 Starting contract interaction...\n");

  const network = hre.network.name;
  const [signer] = await hre.ethers.getSigners();

  console.log("📍 Network:", network);
  console.log("👤 Signer:", signer.address);
  console.log("💰 Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(signer.address)), "ETH\n");

  // Load deployment info
  const deploymentFile = path.join(__dirname, "..", "deployments", `${network}-deployment.json`);

  if (!fs.existsSync(deploymentFile)) {
    console.log("❌ Deployment file not found:", deploymentFile);
    console.log("   Please deploy contracts first");
    return;
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));

  // Get contract instances
  const pauserSetAddress = deploymentInfo.contracts.PauserSet.address;
  const privateForexTradingAddress = deploymentInfo.contracts.PrivateForexTrading.address;

  const PauserSet = await hre.ethers.getContractAt("PauserSet", pauserSetAddress);
  const PrivateForexTrading = await hre.ethers.getContractAt(
    "PrivateForexTrading",
    privateForexTradingAddress
  );

  console.log("📋 Contract Addresses:");
  console.log("   PauserSet:", pauserSetAddress);
  console.log("   PrivateForexTrading:", privateForexTradingAddress);
  console.log();

  // ======================
  // PauserSet Interaction
  // ======================
  console.log("=" .repeat(60));
  console.log("PauserSet Contract");
  console.log("=" .repeat(60));

  const pauserCount = await PauserSet.getPauserCount();
  console.log("Total Pausers:", pauserCount.toString());

  for (let i = 0; i < pauserCount; i++) {
    const pauser = await PauserSet.getPauserAt(i);
    const isPauser = await PauserSet.isPauser(pauser);
    console.log(`Pauser ${i}:`, pauser, "- Valid:", isPauser);
  }

  console.log();

  // ======================
  // PrivateForexTrading Interaction
  // ======================
  console.log("=" .repeat(60));
  console.log("PrivateForexTrading Contract");
  console.log("=" .repeat(60));

  const owner = await PrivateForexTrading.owner();
  const paused = await PrivateForexTrading.paused();
  const pauserSetContract = await PrivateForexTrading.pauserSet();
  const minDeposit = await PrivateForexTrading.MIN_DEPOSIT();
  const maxLeverage = await PrivateForexTrading.MAX_LEVERAGE();

  console.log("Owner:", owner);
  console.log("Paused:", paused);
  console.log("PauserSet:", pauserSetContract);
  console.log("MIN_DEPOSIT:", minDeposit.toString());
  console.log("MAX_LEVERAGE:", maxLeverage.toString());
  console.log();

  // Check position and order counts for signer
  const positionCount = await PrivateForexTrading.positionCount(signer.address);
  const orderCount = await PrivateForexTrading.orderCount(signer.address);

  console.log("Your Trading Stats:");
  console.log("   Positions:", positionCount.toString());
  console.log("   Orders:", orderCount.toString());
  console.log();

  // ======================
  // Interactive Menu
  // ======================
  console.log("=" .repeat(60));
  console.log("Available Interactions");
  console.log("=" .repeat(60));
  console.log();
  console.log("📝 Note: For FHE operations, you need to use fhevmjs for encryption");
  console.log();
  console.log("Example interactions:");
  console.log("1. Check if paused:");
  console.log("   const paused = await PrivateForexTrading.isPaused();");
  console.log();
  console.log("2. Get balance (requires fhevmjs for decryption):");
  console.log("   const balance = await PrivateForexTrading.getBalance(address, permission);");
  console.log();
  console.log("3. Deposit (requires fhevmjs for encryption):");
  console.log("   // Encrypt amount with fhevmjs");
  console.log("   // Generate input proof");
  console.log("   // await PrivateForexTrading.deposit(encryptedAmount, inputProof);");
  console.log();
  console.log("4. Open Position (requires fhevmjs):");
  console.log("   // Encrypt: amount, leverage, isLong");
  console.log("   // await PrivateForexTrading.openPosition(...);");
  console.log();
  console.log("5. Place Order (requires fhevmjs):");
  console.log("   // Encrypt: amount, targetPrice, stopLoss, takeProfit, isLong");
  console.log("   // await PrivateForexTrading.placeOrder(...);");
  console.log();

  // ======================
  // Owner-Only Functions (if signer is owner)
  // ======================
  if (owner.toLowerCase() === signer.address.toLowerCase()) {
    console.log("=" .repeat(60));
    console.log("Owner Functions (You are the owner!)");
    console.log("=" .repeat(60));
    console.log();
    console.log("You can call:");
    console.log("1. Update price: updatePrice(encryptedNewPrice, inputProof)");
    console.log("2. Pause contract: pause() - if you're a pauser");
    console.log("3. Unpause contract: unpause() - if you're a pauser");
    console.log();
  }

  // Check if signer is a pauser
  const isSignerPauser = await PauserSet.isPauser(signer.address);
  if (isSignerPauser) {
    console.log("=" .repeat(60));
    console.log("Pauser Functions (You are a pauser!)");
    console.log("=" .repeat(60));
    console.log();
    console.log("You can call:");
    console.log("1. Pause: await PrivateForexTrading.pause()");
    console.log("2. Unpause: await PrivateForexTrading.unpause()");
    console.log();
  }

  console.log("=" .repeat(60));
  console.log("🎉 INTERACTION COMPLETE!");
  console.log("=" .repeat(60));
  console.log();
  console.log("💡 Tip: Use fhevmjs library for encrypting inputs before sending transactions");
  console.log("📖 See: https://docs.zama.ai/fhevm");
  console.log();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
