import type { HardhatRuntimeEnvironment } from 'hardhat/types';

import { moveBlocks } from './utils/moveBlock';

export async function createVault(hre: HardhatRuntimeEnvironment) {
  const bn = await hre.ethers.provider.getBlockNumber();

  console.log(bn);
  const hre2 = await moveBlocks(hre, 5);

  const bn2 = await hre2.ethers.provider.getBlockNumber();

  console.log(bn2);
  const hre3 = await moveBlocks(hre2, 5);

  const bn3 = await hre3.ethers.provider.getBlockNumber();

  console.log(bn3);
}

createVault(hre)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
