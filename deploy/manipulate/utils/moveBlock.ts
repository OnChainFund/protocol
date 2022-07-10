import { network } from 'hardhat';

export async function moveBlocks(hre: any, amount: number): Promise<any> {
  const {
    // deployments: { get },
    ethers: { provider },
  } = hre;

  const bn = await provider.getBlockNumber();

  console.log(bn);
  console.log('Moving blocks...');
  for (let index = 0; index < amount; index++) {
    await network.provider.request({
      method: 'evm_mine',
      params: [],
    });
  }

  const bn2 = await provider.getBlockNumber();

  console.log(bn2);
  console.log(`Moved ${amount} blocks`);

  return hre;
}
