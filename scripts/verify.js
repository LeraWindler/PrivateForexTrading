const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("\n🔍 Starting contract verification...\n");

  const network = hre.network.name;

  // Check if on a verifiable network
  if (network === "hardhat" || network === "localhost") {
    console.log("⚠️  Cannot verify contracts on local network");
    console.log("   Please deploy to a public testnet or mainnet");
    return;
  }

  // Check for Etherscan API key
  if (!process.env.ETHERSCAN_API_KEY || process.env.ETHERSCAN_API_KEY === "your_etherscan_api_key") {
    console.log("❌ ETHERSCAN_API_KEY not set in .env file");
    console.log("   Please add your Etherscan API key to continue");
    return;
  }

  // Load deployment info
  const deploymentFile = path.join(__dirname, "..", "deployments", `${network}-deployment.json`);

  if (!fs.existsSync(deploymentFile)) {
    console.log("❌ Deployment file not found:", deploymentFile);
    console.log("   Please deploy contracts first using: npx hardhat run scripts/deploy.js --network", network);
    return;
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));

  console.log("📍 Network:", network);
  console.log("📄 Deployment file:", deploymentFile);
  console.log();

  // Verify PauserSet
  console.log("=" .repeat(60));
  console.log("Verifying PauserSet...");
  console.log("=" .repeat(60));

  const pauserSetAddress = deploymentInfo.contracts.PauserSet.address;
  const pausers = deploymentInfo.contracts.PauserSet.pausers;

  console.log("Address:", pauserSetAddress);
  console.log("Constructor args:", JSON.stringify([pausers]));
  console.log();

  try {
    await hre.run("verify:verify", {
      address: pauserSetAddress,
      constructorArguments: [pausers],
    });
    console.log("✅ PauserSet verified successfully!");
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ PauserSet already verified");
    } else {
      console.log("❌ PauserSet verification failed:", error.message);
    }
  }

  console.log();

  // Verify PrivateForexTrading
  console.log("=" .repeat(60));
  console.log("Verifying PrivateForexTrading...");
  console.log("=" .repeat(60));

  const privateForexTradingAddress = deploymentInfo.contracts.PrivateForexTrading.address;
  const pauserSetForTrading = deploymentInfo.contracts.PrivateForexTrading.pauserSet;
  const kmsGeneration = deploymentInfo.contracts.PrivateForexTrading.kmsGeneration;

  console.log("Address:", privateForexTradingAddress);
  console.log("Constructor args:", JSON.stringify([pauserSetForTrading, kmsGeneration]));
  console.log();

  try {
    await hre.run("verify:verify", {
      address: privateForexTradingAddress,
      constructorArguments: [pauserSetForTrading, kmsGeneration],
    });
    console.log("✅ PrivateForexTrading verified successfully!");
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ PrivateForexTrading already verified");
    } else {
      console.log("❌ PrivateForexTrading verification failed:", error.message);
    }
  }

  console.log();
  console.log("=" .repeat(60));
  console.log("🎉 VERIFICATION COMPLETE!");
  console.log("=" .repeat(60));
  console.log();
  console.log("🔗 Etherscan Links:");
  console.log("   PauserSet:", deploymentInfo.etherscan.PauserSet);
  console.log("   PrivateForexTrading:", deploymentInfo.etherscan.PrivateForexTrading);
  console.log();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
