import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployPauserSet: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer, pauser } = await getNamedAccounts();

  // Get pauser addresses from environment or use defaults
  const pausers: string[] = [];

  // Read NUM_PAUSERS from environment
  const numPausers = parseInt(process.env.NUM_PAUSERS || "1");

  for (let i = 0; i < numPausers; i++) {
    const pauserAddress = process.env[`PAUSER_ADDRESS_${i}`];
    if (pauserAddress) {
      pausers.push(pauserAddress);
    } else if (i === 0) {
      // Use default pauser account if not specified
      pausers.push(pauser);
    }
  }

  if (pausers.length === 0) {
    console.warn("Warning: No pausers configured, using deployer as pauser");
    pausers.push(deployer);
  }

  console.log("Deploying PauserSet with pausers:", pausers);

  const pauserSet = await deploy("PauserSet", {
    from: deployer,
    args: [pausers],
    log: true,
    waitConfirmations: 1,
  });

  console.log(`PauserSet deployed at: ${pauserSet.address}`);
  console.log(`Number of pausers: ${pausers.length}`);

  return true;
};

export default deployPauserSet;
deployPauserSet.tags = ["PauserSet", "all"];
