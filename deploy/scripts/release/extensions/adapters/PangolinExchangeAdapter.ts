import type { UniswapV2ExchangeAdapterArgs } from '@enzymefinance/protocol';
import type { DeployFunction } from 'hardhat-deploy/types';

import { isOneOfNetworks, Network } from '../../../../utils/helpers';

const fn: DeployFunction = async function (hre) {
  const {
    deployments: { deploy, get },
    ethers: { getSigners },
  } = hre;

  const deployer = (await getSigners())[0];
  // const config = await loadConfig(hre);
  const integrationManager = await get('IntegrationManager');

  await deploy('PangolinExchangeAdapter', {
    // args: [integrationManager.address, config.uniswap.router] as UniswapV2ExchangeAdapterArgs,
    args: [integrationManager.address, '0x688d21b0B8Dc35971AF58cFF1F7Bf65639937860'] as UniswapV2ExchangeAdapterArgs,
    from: deployer.address,
    linkedData: {
      type: 'ADAPTER',
    },
    log: true,
    skipIfAlreadyDeployed: true,
  });
};

fn.tags = ['Release', 'Adapters', 'PangolinExchangeAdapter'];
fn.dependencies = ['Config', 'IntegrationManager'];
fn.skip = async (hre) => {
  const chain = await hre.getChainId();

  return !isOneOfNetworks(chain, [Network.AVALANCHE]);
};
console.log('hi');
fn(hre);
export default fn;
