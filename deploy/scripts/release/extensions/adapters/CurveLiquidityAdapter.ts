import type { CurveLiquidityAdapterArgs } from '@enzymefinance/protocol';
import type { DeployFunction } from 'hardhat-deploy/types';

import { loadConfig } from '../../../../utils/config';
import { isOneOfNetworks, Network } from '../../../../utils/helpers';

const fn: DeployFunction = async function (hre) {
  const {
    deployments: { deploy, get },
    ethers: { getSigners },
  } = hre;

  const deployer = (await getSigners())[0];
  const config = await loadConfig(hre);
  const curvePriceFeed = await get('CurvePriceFeed');
  const integrationManager = await get('IntegrationManager');

  await deploy('CurveLiquidityAdapter', {
    args: [
      integrationManager.address,
      curvePriceFeed.address,
      config.wrappedNativeAsset,
      config.curve.minter,
      config.primitives.crv,
      config.curve.nativeAssetAddress,
    ] as CurveLiquidityAdapterArgs,
    from: deployer.address,
    linkedData: {
      nonSlippageAdapter: true,
      type: 'ADAPTER',
    },
    log: true,
    skipIfAlreadyDeployed: true,
  });
};

fn.tags = ['Release', 'Adapters', 'CurveLiquidityAdapter'];
fn.dependencies = ['Config', 'CurvePriceFeed', 'IntegrationManager'];
fn.skip = async (hre) => {
  const chain = await hre.getChainId();

  return !isOneOfNetworks(chain, [Network.HOMESTEAD, Network.MATIC, Network.AVALANCHE]);
};

export default fn;
