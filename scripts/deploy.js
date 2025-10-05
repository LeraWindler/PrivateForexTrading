const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("\n🚀 Starting deployment...\n");

  // Get deployment configuration
  const network = hre.network.name;
  const [deployer] = await hre.ethers.getSigners();

  console.log("📍 Network:", network);
  console.log("👤 Deployer:", deployer.address);
  console.log("💰 Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH\n");

  // Get pauser configuration
  const numPausers = parseInt(process.env.NUM_PAUSERS || "1");
  const pausers = [];

  for (let i = 0; i < numPausers; i++) {
    const pauserAddress = process.env[`PAUSER_ADDRESS_${i}`];
    if (pauserAddress && pauserAddress !== "0x0000000000000000000000000000000000000000") {
      pausers.push(pauserAddress);
    }
  }

  // Use deployer as pauser if none configured
  if (pausers.length === 0) {
    console.log("⚠️  No pausers configured, using deployer as pauser");
    pausers.push(deployer.address);
  }

  console.log("🛡️  Pausers configured:", pausers.length);
  pausers.forEach((pauser, i) => {
    console.log(`   ${i}: ${pauser}`);
  });
  console.log();

  // Deploy PauserSet
  console.log("📝 Deploying PauserSet...");
  const PauserSet = await hre.ethers.getContractFactory("PauserSet");
  const pauserSet = await PauserSet.deploy(pausers);
  await pauserSet.waitForDeployment();
  const pauserSetAddress = await pauserSet.getAddress();

  console.log("✅ PauserSet deployed to:", pauserSetAddress);
  console.log();

  // Get KMS Generation address
  const kmsGenerationAddress = process.env.KMS_GENERATION_ADDRESS || "0x0000000000000000000000000000000000000000";

  if (kmsGenerationAddress === "0x0000000000000000000000000000000000000000") {
    console.log("⚠️  WARNING: Using zero address for KMS Generation");
    console.log("   Please update KMS_GENERATION_ADDRESS in .env for production\n");
  }

  console.log("🔑 KMS Generation Address:", kmsGenerationAddress);
  console.log();

  // Deploy PrivateForexTrading
  console.log("📝 Deploying PrivateForexTrading...");
  const PrivateForexTrading = await hre.ethers.getContractFactory("PrivateForexTrading");
  const privateForexTrading = await PrivateForexTrading.deploy(
    pauserSetAddress,
    kmsGenerationAddress
  );
  await privateForexTrading.waitForDeployment();
  const privateForexTradingAddress = await privateForexTrading.getAddress();

  console.log("✅ PrivateForexTrading deployed to:", privateForexTradingAddress);
  console.log();

  // Verify deployment
  console.log("🔍 Verifying deployment...");
  const owner = await privateForexTrading.owner();
  const paused = await privateForexTrading.paused();
  const minDeposit = await privateForexTrading.MIN_DEPOSIT();
  const maxLeverage = await privateForexTrading.MAX_LEVERAGE();

  console.log("   Owner:", owner);
  console.log("   Paused:", paused);
  console.log("   MIN_DEPOSIT:", minDeposit.toString());
  console.log("   MAX_LEVERAGE:", maxLeverage.toString());
  console.log();

  // Save deployment info
  const deploymentInfo = {
    network: network,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      PauserSet: {
        address: pauserSetAddress,
        pausers: pausers,
      },
      PrivateForexTrading: {
        address: privateForexTradingAddress,
        pauserSet: pauserSetAddress,
        kmsGeneration: kmsGenerationAddress,
        owner: owner,
        minDeposit: minDeposit.toString(),
        maxLeverage: maxLeverage.toString(),
      },
    },
    etherscan: {
      PauserSet: `https://${network === "sepolia" ? "sepolia." : ""}etherscan.io/address/${pauserSetAddress}`,
      PrivateForexTrading: `https://${network === "sepolia" ? "sepolia." : ""}etherscan.io/address/${privateForexTradingAddress}`,
    },
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentsDir, `${network}-deployment.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

  console.log("💾 Deployment info saved to:", deploymentFile);
  console.log();

  console.log("=" .repeat(60));
  console.log("🎉 DEPLOYMENT SUCCESSFUL!");
  console.log("=" .repeat(60));
  console.log();
  console.log("📋 Summary:");
  console.log("   Network:", network);
  console.log("   PauserSet:", pauserSetAddress);
  console.log("   PrivateForexTrading:", privateForexTradingAddress);
  console.log();
  console.log("🔗 Etherscan Links:");
  console.log("   PauserSet:", deploymentInfo.etherscan.PauserSet);
  console.log("   PrivateForexTrading:", deploymentInfo.etherscan.PrivateForexTrading);
  console.log();
  console.log("📝 Next steps:");
  console.log("   1. Verify contracts: npx hardhat run scripts/verify.js --network", network);
  console.log("   2. Test interaction: npx hardhat run scripts/interact.js --network", network);
  console.log("   3. Run simulation: npx hardhat run scripts/simulate.js --network", network);
  console.log();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
