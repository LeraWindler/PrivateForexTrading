import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployPrivateForexTrading: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, get } = deployments;
  const { deployer } = await getNamedAccounts();

  // Get PauserSet deployment
  const pauserSet = await get("PauserSet");

  // Get KMS Generation address from environment
  const kmsGenerationAddress = process.env.KMS_GENERATION_ADDRESS || "0x0000000000000000000000000000000000000000";

  console.log("Deploying PrivateForexTrading...");
  console.log("PauserSet address:", pauserSet.address);
  console.log("KMS Generation address:", kmsGenerationAddress);

  const privateForexTrading = await deploy("PrivateForexTrading", {
    from: deployer,
    args: [pauserSet.address, kmsGenerationAddress],
    log: true,
    waitConfirmations: 1,
  });

  console.log(`PrivateForexTrading deployed at: ${privateForexTrading.address}`);

  return true;
};

export default deployPrivateForexTrading;
deployPrivateForexTrading.tags = ["PrivateForexTrading", "all"];
deployPrivateForexTrading.dependencies = ["PauserSet"];
