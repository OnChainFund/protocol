import hre from 'hardhat';
import type { HardhatRuntimeEnvironment } from 'hardhat/types';

import { moveBlocks } from './utils/moveBlock';
import { getContract } from './utils/utils';

export async function createVault(hre: HardhatRuntimeEnvironment) {
  const {
    // deployments: { get },
    ethers: { getSigners },
  } = hre;
  const deployer = (await getSigners())[0];
  const fundDeployer = await getContract('FundDeployer', hre.ethers.provider);
  const usdcAddress = '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E';

  // deploy fund
  {
    const tx = await fundDeployer.connect(deployer).createNewFund(
      deployer.address,
      'test_1',
      'T1',
      usdcAddress,
      86400, // _sharesActionTimelock
      '0x', // _feeManagerConfigData
      '0x', // _policyManagerConfigData
      {
        gasLimit: 20e5,
        // gasPrice: 20e14,
      },
    );

    console.log(tx);
    // let receipt = await tx.wait(2);
    // console.log(receipt);
    // const event = tx1.events.find((event) => event.event === "Transfer");
    //    console.log(receipt)
    await moveBlocks(5);
    const rc = await tx.wait(); // 0ms, as tx is already confirmed

    console.log(rc);
    const event = rc.events.find((event: any) => event.event === 'NewFundCreated');

    console.log(event);
  }
}

createVault(hre)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
