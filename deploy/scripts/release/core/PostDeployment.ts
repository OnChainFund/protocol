import {
  AddressListRegistry,
  addressListRegistryAddToListSelector,
  addressListRegistryAttestListsSelector,
  addressListRegistryCreateListSelector,
  addressListRegistryRemoveFromListSelector,
  addressListRegistrySetListOwnerSelector,
  addressListRegistrySetListUpdateTypeSelector,
  AddressListUpdateType,
  curveMinterMintManySelector,
  curveMinterMintSelector,
  curveMinterToggleApproveMintSelector,
  //encodeArgs,
  FundDeployer as FundDeployerContract,
  pricelessAssetBypassStartAssetBypassTimelockSelector,
  ProtocolFeeTracker,
  //synthetixAssignExchangeDelegateSelector,
  vaultCallAnyDataHash,
} from '@enzymefinance/protocol';
//import { utils } from 'ethers';
import type { DeployFunction } from 'hardhat-deploy/types';

import { loadConfig } from '../../../utils/config';

const fn: DeployFunction = async function (hre) {
  const {
    deployments: { all, get, log },
    ethers: { getSigners },
  } = hre;

  const config = await loadConfig(hre);
  const deployer = (await getSigners())[0];

  const addressListRegistry = await get('AddressListRegistry');
  const cumulativeSlippageTolerancePolicy = await get('CumulativeSlippageTolerancePolicy');
  const dispatcher = await get('Dispatcher');
  const fundDeployer = await get('FundDeployer');
  const onlyRemoveDustExternalPositionPolicy = await get('OnlyRemoveDustExternalPositionPolicy');
  const onlyUntrackDustOrPricelessAssetsPolicy = await get('OnlyUntrackDustOrPricelessAssetsPolicy');
  const protocolFeeTracker = await get('ProtocolFeeTracker');
  //const synthetixAdapter = await get('SynthetixAdapter');

  const fundDeployerInstance = new FundDeployerContract(fundDeployer.address, deployer);

  // Register vault calls
  const vaultCalls = [
    // Calls to trigger the PricelessAssetBypassMixin's timelock
    [
      onlyRemoveDustExternalPositionPolicy.address,
      pricelessAssetBypassStartAssetBypassTimelockSelector,
      vaultCallAnyDataHash,
    ],
    [
      onlyUntrackDustOrPricelessAssetsPolicy.address,
      pricelessAssetBypassStartAssetBypassTimelockSelector,
      vaultCallAnyDataHash,
    ],
    [
      cumulativeSlippageTolerancePolicy.address,
      pricelessAssetBypassStartAssetBypassTimelockSelector,
      vaultCallAnyDataHash,
    ],
    // All AddressListRegistry actions
    [addressListRegistry.address, addressListRegistryAddToListSelector, vaultCallAnyDataHash],
    [addressListRegistry.address, addressListRegistryAttestListsSelector, vaultCallAnyDataHash],
    [addressListRegistry.address, addressListRegistryCreateListSelector, vaultCallAnyDataHash],
    [addressListRegistry.address, addressListRegistryRemoveFromListSelector, vaultCallAnyDataHash],
    [addressListRegistry.address, addressListRegistrySetListOwnerSelector, vaultCallAnyDataHash],
    [addressListRegistry.address, addressListRegistrySetListUpdateTypeSelector, vaultCallAnyDataHash],
  ];

  // Calls to allow claiming rewards from Curve's Minter
  if (config.curve) {
    vaultCalls.push(
      [config.curve.minter, curveMinterMintSelector, vaultCallAnyDataHash],
      [config.curve.minter, curveMinterMintManySelector, vaultCallAnyDataHash],
      [config.curve.minter, curveMinterToggleApproveMintSelector, vaultCallAnyDataHash],
    );
  }

  // Allows delegating trading on Synthetix to the SynthetixAdapter only
  //if (config.synthetix) {
  //  vaultCalls.push([
  //    config.synthetix.delegateApprovals,
  //    synthetixAssignExchangeDelegateSelector,
  //    utils.eccak256(encodeArgs(['address'], [synthetixAdapter.address])),
  //  ]);
  //}

  const vaultCallValues = Object.values(vaultCalls);
  const vaultCallContracts = vaultCallValues.map(([contract]) => contract);
  const vaultCallFunctionSigs = vaultCallValues.map(([, functionSig]) => functionSig);
  const vaultCallDataHashes = vaultCallValues.map(([, , dataHash]) => dataHash);
  log('Registering vault calls');

  await fundDeployerInstance.registerVaultCalls(vaultCallContracts, vaultCallFunctionSigs, vaultCallDataHashes);

  // Create lists of all official adapters, policies, and fees
  const addressListRegistryContract = new AddressListRegistry(addressListRegistry.address, deployer);

  const adapters = Object.values(await all())
    .filter((item) => item.linkedData?.type === 'ADAPTER')
    .map((item) => item.address.toLowerCase());
  await addressListRegistryContract.createList(dispatcher.address, AddressListUpdateType.AddAndRemove, adapters);

  const fees = Object.values(await all())
    .filter((item) => item.linkedData?.type === 'FEE')
    .map((item) => item.address.toLowerCase());
  await addressListRegistryContract.createList(dispatcher.address, AddressListUpdateType.AddAndRemove, fees);

  const policies = Object.values(await all())
    .filter((item) => item.linkedData?.type === 'POLICY')
    .map((item) => item.address.toLowerCase());
  await addressListRegistryContract.createList(dispatcher.address, AddressListUpdateType.AddAndRemove, policies);

  // Set the protocol fee
  const protocolFeeTrackerInstance = new ProtocolFeeTracker(protocolFeeTracker.address, deployer);
  await protocolFeeTrackerInstance.setFeeBpsDefault(config.feeBps);
};

fn.tags = ['Release'];
fn.dependencies = [
  'Adapters',
  'AddressListRegistry',
  'CumulativeSlippageTolerancePolicy',
  'Dispatcher',
  'Fees',
  'FundDeployer',
  'OnlyRemoveDustExternalPositionPolicy',
  'OnlyUntrackDustOrPricelessAssetsPolicy',
  'Policies',
  'ProtocolFeeTracker',
  //'SynthetixAdapter',
];
fn.runAtTheEnd = true;

export default fn;
