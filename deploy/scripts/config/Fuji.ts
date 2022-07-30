import { ChainlinkRateAsset } from '@enzymefinance/protocol';
import type { DeploymentConfig } from '@enzymefinance/testutils';
import { constants } from 'ethers';
import type { DeployFunction } from 'hardhat-deploy/types';

import { saveConfig } from '../../utils/config';
import { isFuji } from '../../utils/helpers';

// Special assets
const wavax = '0x6cEeB8fec16F7276F57ACF70C14ecA6008d3DDD4';
const weth = wavax;
const wrappedNativeAsset = wavax;
const feeToken = wavax;
// const feeToken = constants.AddressZero;

// WETH is not included as it is auto-included in the chainlink price feed
const primitives = {
  link: '0x5B3a2CAED90515e36830167529AFeDea75419b7a',
  usdt: '0xd1Cc87496aF84105699E82D46B6c5Ab6775Afae4',

  wavax: '0x6cEeB8fec16F7276F57ACF70C14ecA6008d3DDD4',
  // true
  wbtc: '0xbC9052c594261Acc1a26271567bDb72A8A1Acac9',
  weth: '0x96058B65CE7d0DBa4B85DAf49E06663B97442137',
} as const;

const aggregators = {
  link: ['0x34C4c526902d88a3Aa98DB8a9b802603EB1E3470', ChainlinkRateAsset.USD],
  usdt: ['0x7898AcCC83587C3C55116c5230C17a6Cd9C71bad', ChainlinkRateAsset.USD],
  wavax: ['0x5498BB86BC934c8D34FDA08E81D444153d0D06aD', ChainlinkRateAsset.USD],
  wbtc: ['0x31CF013A08c6Ac228C94551d535d5BAfE19c602a', ChainlinkRateAsset.USD],
  weth: ['0x86d67c3D38D2bCeE722E601025C25a575021c6EA', ChainlinkRateAsset.USD],
} as const;
const ethUsdAggregator = '0x5498BB86BC934c8D34FDA08E81D444153d0D06aD';

// prettier-ignore
const fujiConfig: DeploymentConfig = {
  chainlink: {
    aggregators,
    ethusd: ethUsdAggregator,
  },
  feeBps: 50,
  feeToken,
  feeTokenBurn: {
    burnFromVault: false,
    externalBurnerAddress: constants.AddressZero,
    sendToProtocolFeeReserve: true,
  },
  gsn: {
    relayHub: '0x0321ABDba4dCf3f3AeCf463Def8F866568BC5174',
    relayWorker: constants.AddressZero,
    trustedForwarder: '0xDFdA581eE8bf25Ade192DE74BcaE0A60b9860B33',
  },
  positionsLimit: 20,
  primitives,
  weth,
  wrappedNativeAsset,
} as any as DeploymentConfig;

const fn: DeployFunction = async (hre) => {
  await saveConfig(hre, fujiConfig);
};

fn.tags = ['Config'];
fn.skip = async (hre) => {
  // Run this only for avalanche.
  const chain = await hre.getChainId();

  return !isFuji(chain);
};

export default fn;
