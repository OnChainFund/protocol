import { ChainlinkRateAsset } from '@enzymefinance/protocol';
import type { DeploymentConfig } from '@enzymefinance/testutils';
import { constants } from 'ethers';
import type { DeployFunction } from 'hardhat-deploy/types';

import { saveConfig } from '../../utils/config';
import { isAvalanche } from '../../utils/helpers';

// Special assets
//const mln = constants.AddressZero;
const weth = '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB';
const wavax = '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7';
const wrappedNativeAsset = wavax;
//const feeToken = usdc;
const feeToken = constants.AddressZero;

// WETH is not included as it is auto-included in the chainlink price feed
const primitives = {
  // polygon
  '1inch': '0xd501281565bf7789224523144Fe5D98e8B28f267',
  aave: '0x63a72806098Bd3D9520cC43356dD78afe5D386D9',
  bat: '0x98443B96EA4b0858FDF3219Cd13e98C7A4690588',
  comp: '0xc3048E19E76CB9a3Aa9d77D8C03c29Fc906e2437',
  crv: '0x249848BeCA43aC405b8102Ec90Dd5F22CA513c06',
  dai: '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70',
  frax: '0xD24C2Ad096400B6FBcd2ad8B24E7acBc21A1da64',
  fxs: '0x214DB107654fF987AD859F34125307783fC8e387',
  knc: '0x39fC9e94Caeacb435842FADeDeCB783589F50f5f',
  link: '0x5947BB275c521040051D82396192181b413227A3',
  mkr: '0x88128fd4b259552A9A1D457f435a6527AAb72d42',
  snx: '0xBeC243C995409E6520D7C41E404da5dEba4b209B',
  sushi: '0x37B608519F91f70F2EeB0e5Ed9AF4061722e4F76',
  uma: '0x3Bd2B1c7ED8D396dbb98DED3aEbb41350a5b2339',
  uni: '0x8eBAf22B6F053dFFeaf46f4Dd9eFA95D89ba8580',
  usdc: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
  usdt: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7',
  wbtc: '0x50b7545627a5162F82A992c33b87aDc75187B218',
  weth: '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB',
  grt: '0x8a0cAc13c7da965a312f08ea4229c37869e85cB9',
  // avalanche native
  wavax: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
  joe: '0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd',
  qi: '0x8729438EB15e2C8B576fCc6AeCdA6A148776C0F5',
  png: '0x60781C2586D68229fde47564546784ab3fACA982',
  acre: '0x00EE200Df31b869a321B10400Da10b561F3ee60d',
  ime: '0xF891214fdcF9cDaa5fdC42369eE4F27F226AdaD6',
  klo: '0xb27c8941a7Df8958A1778c0259f76D1F8B711C35',
  tus: '0xf693248F96Fe03422FEa95aC0aFbBBc4a8FdD172',
  melt: '0x47EB6F7525C1aA999FBC9ee92715F5231eB1241D',
  yak: '0x59414b3089ce2AF0010e7523Dea7E2b35d776ec7',
  mim: '0x130966628846BFd36ff31a822705796e8cb8C18D',
  xava: '0xd1c3f94DE7e5B45fa4eDBBA472491a9f4B166FC4',
  cly: '0xec3492a2508DDf4FDc0cD76F31f340b30d1793e6',
  ptp: '0x22d4002028f537599bE9f666d1c4Fa138522f9c8',
} as const;

const aggregators = {
  // cross chain
  aave: ['0x3CA13391E9fb38a75330fb28f8cc2eB3D9ceceED', ChainlinkRateAsset.USD],
  crv: ['0x7CF8A6090A9053B01F3DF4D4e6CfEdd8c90d9027', ChainlinkRateAsset.USD],
  dai: ['0x51D7180edA2260cc4F6e4EebB82FEF5c3c2B8300', ChainlinkRateAsset.USD],
  link: ['0x49ccd9ca821EfEab2b98c60dC60F518E765EDe9a', ChainlinkRateAsset.USD],
  ohm: ['0x0c40Be7D32311b36BE365A2A220243B8A651df5E', ChainlinkRateAsset.USD],
  sushi: ['0x449A373A090d8A1e5F74c63Ef831Ceff39E94563', ChainlinkRateAsset.USD],
  uni: ['0x9a1372f9b1B71B3A5a72E092AE67E172dBd7Daaa', ChainlinkRateAsset.USD],
  usdc: ['0xF096872672F44d6EBA71458D74fe67F9a77a23B9', ChainlinkRateAsset.USD],
  usdt: ['0xEBE676ee90Fe1112671f19b6B7459bC678B67e8a', ChainlinkRateAsset.USD],
  wbtc: ['0x2779D32d5166BAaa2B2b658333bA7e6Ec0C65743', ChainlinkRateAsset.USD],
  weth: ['0x976B3D034E162d8bD72D6b9C989d545b839003b0', ChainlinkRateAsset.USD],
  // avalanche local
  wavax: ['0x0A77230d17318075983913bC2145DB16C7366156', ChainlinkRateAsset.USD],
  xava: ['0x4Cf57DC9028187b9DAaF773c8ecA941036989238', ChainlinkRateAsset.USD],
  qi: ['0x36E039e6391A5E7A7267650979fdf613f659be5D', ChainlinkRateAsset.USD],
} as const;
const ethUsdAggregator = '0x976B3D034E162d8bD72D6b9C989d545b839003b0';

const atokens = {
  aaave: ['0xf329e36C7bF6E5E86ce2150875a84Ce77f477375', primitives.aave] as [string, string],
  adai: ['0x82E64f49Ed5EC1bC6e43DAD4FC8Af9bb3A2312EE', primitives.dai] as [string, string],
  ausdc: ['0x625E7708f30cA75bfd92586e17077590C60eb4cD', primitives.usdc] as [string, string],
  ausdt: ['0x6ab707Aca953eDAeFBc4fD23bA73294241490620', primitives.usdt] as [string, string],
  awbtc: ['0x078f358208685046a11C85e8ad32895DED33A249', primitives.wbtc] as [string, string],
  aweth: ['0xe50fA9b3c56FfB159cB0FCA61F5c9D750e8128c8', weth] as [string, string],
  awavax: ['0x6d80113e533a2C0fe82EaBD35f1875DcEA89Ea97', primitives.wavax] as [string, string],
  alink: ['0x191c10Aa4AF7C30e871E70C95dB0E4eb77237530', primitives.link] as [string, string],
};

// prettier-ignore
const mainnetConfig: DeploymentConfig = {
  // 原 aave v2 -> v3
  aave: {
    atokens,
    lendingPoolAddressProvider: '0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb',
    protocolDataProvider: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654',
  },
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
    relayHub: '0xafAFDac90164e4b2D4e39a1ac3e9dBC635dbbEA5',
    relayWorker: constants.AddressZero,
    trustedForwarder: '0x14c6b99AfFC61e9b0753146F3437A223d0c58279',
  },
  positionsLimit: 20,
  primitives,
  weth,
  wrappedNativeAsset,
} as any as DeploymentConfig;

const fn: DeployFunction = async (hre) => {
  await saveConfig(hre, mainnetConfig);
};

fn.tags = ['Config'];
fn.skip = async (hre) => {
  // Run this only for polygon.
  const chain = await hre.getChainId();

  return !isAvalanche(chain);
};

export default fn;
