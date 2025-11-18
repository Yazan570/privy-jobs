import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedFHEPrivyJobs = await deploy("FHEPrivyJobs", {
    from: deployer,
    log: true,
  });

  console.log(`FHEPrivyJobs contract: `, deployedFHEPrivyJobs.address);
};
export default func;
func.id = "deploy_FHEPrivyJobs"; // id required to prevent reexecution
func.tags = ["FHEPrivyJobs"];
