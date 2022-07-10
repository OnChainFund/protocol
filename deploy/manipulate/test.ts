import type { AddressListRegistryArgs } from '@enzymefinance/protocol';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
export async function test(hre: HardhatRuntimeEnvironment) {
  const {
    deployments: { deploy, get },
    ethers: { getSigners },
  } = hre;

  const deployer = (await getSigners())[0];
  const dispatcher = await get('Dispatcher');
}

test(hre);
