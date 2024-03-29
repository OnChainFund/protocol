import type { AddressLike } from '@enzymefinance/ethers';
import type { SignerWithAddress } from '@enzymefinance/hardhat';
import type { ComptrollerLib, VaultLib } from '@enzymefinance/protocol';
import {
  LiquityDebtPositionLib,
  ONE_HUNDRED_PERCENT_IN_BPS,
  ONE_PERCENT_IN_BPS,
  StandardToken,
} from '@enzymefinance/protocol';
import type { ProtocolDeployment } from '@enzymefinance/testutils';
import {
  createLiquityDebtPosition,
  createNewFund,
  deployProtocolFixture,
  ILiquityHintHelper,
  ILiquitySortedTroves,
  ILiquityTroveManager,
  liquityCalcHints,
  liquityDebtPositionAddCollateral,
  liquityDebtPositionBorrow,
  liquityDebtPositionCloseTrove,
  liquityDebtPositionOpenTrove,
  liquityDebtPositionRemoveCollateral,
  liquityDebtPositionRepay,
} from '@enzymefinance/testutils';
import { BigNumber, utils } from 'ethers';

// Use a liberal gas tolerance throughout the file to account for fluctuations in hint calc costs
const gasAssertionTolerance = 10000;

// Use 2% as global safe maxFee percentage
const maxFeePercentage = utils.parseUnits('0.02', 18);
const liquityLiquidationReserve = utils.parseEther('200');

// Use a collateralization ratio that is high enough above the 150% recovery mode threshold,
// but low enough that it will not be at either end of the sorted troves (important for testing hints)
const startingCollateralizationInBps = BigNumber.from(ONE_PERCENT_IN_BPS).mul(170);

const liquityHintHelperAddress = '0xE84251b93D9524E0d2e621Ba7dc7cb3579F997C0';
const liquitySortedTrovesAddress = '0x8FdD3fbFEb32b28fb73555518f8b361bCeA741A6';

let liquityDebtPosition: LiquityDebtPositionLib;

let comptrollerProxyUsed: ComptrollerLib;
let vaultProxyUsed: VaultLib;

let fundOwner: SignerWithAddress;

let fork: ProtocolDeployment;

let lusd: StandardToken, weth: StandardToken;
let lusdBaseBorrowAmount: BigNumber, wethBaseCollateralAmount: BigNumber;
let openTroveUpperHint: AddressLike, openTroveLowerHint: AddressLike;
let liquityHintHelper: ILiquityHintHelper,
  liquitySortedTroves: ILiquitySortedTroves,
  liquityTroveManager: ILiquityTroveManager;

beforeEach(async () => {
  fork = await deployProtocolFixture();
  [fundOwner] = fork.accounts;

  // Initialize fund and external position
  const { comptrollerProxy, vaultProxy } = await createNewFund({
    denominationAsset: new StandardToken(fork.config.primitives.usdc, provider),
    fundDeployer: fork.deployment.fundDeployer,
    fundOwner,
    signer: fundOwner,
  });

  vaultProxyUsed = vaultProxy;
  comptrollerProxyUsed = comptrollerProxy;

  const { externalPositionProxy } = await createLiquityDebtPosition({
    comptrollerProxy,
    externalPositionManager: fork.deployment.externalPositionManager,
    signer: fundOwner,
  });

  liquityDebtPosition = new LiquityDebtPositionLib(externalPositionProxy, provider);

  weth = new StandardToken(fork.config.weth, whales.weth);
  lusd = new StandardToken(fork.config.primitives.lusd, whales.lusd);

  liquityHintHelper = new ILiquityHintHelper(liquityHintHelperAddress, provider);
  liquitySortedTroves = new ILiquitySortedTroves(liquitySortedTrovesAddress, provider);
  liquityTroveManager = new ILiquityTroveManager(fork.config.liquity.troveManager, provider);

  // Currently, all troves in tests start with the same base borrow and collateral amounts,
  // in order to achieve a target starting collateralization ratio
  wethBaseCollateralAmount = utils.parseEther('10');
  lusdBaseBorrowAmount = (
    await fork.deployment.valueInterpreter.calcCanonicalAssetValue.args(weth, wethBaseCollateralAmount, lusd).call()
  )
    .mul(ONE_HUNDRED_PERCENT_IN_BPS)
    .div(startingCollateralizationInBps);

  // The valid hints will also be the same for all such troves
  const feeEstimate = await liquityTroveManager.getBorrowingFee.args(lusdBaseBorrowAmount).call();
  const openTroveHintRes = await liquityCalcHints({
    collateralAmount: wethBaseCollateralAmount,
    debtAmount: lusdBaseBorrowAmount.add(liquityLiquidationReserve).add(feeEstimate),
    liquityHintHelper,
    liquitySortedTroves,
  });

  openTroveUpperHint = openTroveHintRes.upperHint;
  openTroveLowerHint = openTroveHintRes.lowerHint;

  // Seed vault with more than enough weth for many multiples of the desired collateral amount
  await weth.transfer(vaultProxyUsed, wethBaseCollateralAmount.mul(10));
});

describe('openTrove', () => {
  it('works as expected when called to openTrove by a Fund', async () => {
    const openTroveReceipt = await liquityDebtPositionOpenTrove({
      collateralAmount: wethBaseCollateralAmount,
      comptrollerProxy: comptrollerProxyUsed,
      externalPositionManager: fork.deployment.externalPositionManager,
      externalPositionProxy: liquityDebtPosition,
      lowerHint: openTroveLowerHint,
      lusdAmount: lusdBaseBorrowAmount,
      maxFeePercentage,
      signer: fundOwner,
      upperHint: openTroveUpperHint,
    });

    // Calc total debt amount from OpenTrove
    const openTroveFeeAmount = await liquityTroveManager.getBorrowingFee.args(lusdBaseBorrowAmount).call();
    const openTroveDebtAmount = lusdBaseBorrowAmount.add(liquityLiquidationReserve).add(openTroveFeeAmount);

    const getManagedAssetsCall = await liquityDebtPosition.getManagedAssets.call();

    expect(getManagedAssetsCall).toMatchFunctionOutput(liquityDebtPosition.getManagedAssets.fragment, {
      amounts_: [wethBaseCollateralAmount],
      assets_: [weth.address],
    });

    const getDebtAssetsCall = await liquityDebtPosition.getDebtAssets.call();

    expect(getDebtAssetsCall).toMatchFunctionOutput(liquityDebtPosition.getDebtAssets.fragment, {
      amounts_: [openTroveDebtAmount],
      assets_: [lusd],
    });

    // Actual gas spent varies based on the accuracy of the hint values
    expect(openTroveReceipt).toMatchInlineGasSnapshot('693923', gasAssertionTolerance);
  });
});

describe('addCollateral', () => {
  it('works as expected', async () => {
    await liquityDebtPositionOpenTrove({
      collateralAmount: wethBaseCollateralAmount,
      comptrollerProxy: comptrollerProxyUsed,
      externalPositionManager: fork.deployment.externalPositionManager,
      externalPositionProxy: liquityDebtPosition,
      lowerHint: openTroveLowerHint,
      lusdAmount: lusdBaseBorrowAmount,
      maxFeePercentage,
      signer: fundOwner,
      upperHint: openTroveUpperHint,
    });

    // Calc total debt amount from OpenTrove
    const openTroveFeeAmount = await liquityTroveManager.getBorrowingFee.args(lusdBaseBorrowAmount).call();
    const openTroveDebtAmount = lusdBaseBorrowAmount.add(liquityLiquidationReserve).add(openTroveFeeAmount);

    // Increase the collateral slightly, so as to not move the collateralization ratio much
    const collateralToAddAmount = wethBaseCollateralAmount.mul(ONE_PERCENT_IN_BPS).div(ONE_HUNDRED_PERCENT_IN_BPS);
    const nextCollateralAmount = wethBaseCollateralAmount.add(collateralToAddAmount);
    const nextDebtAmount = openTroveDebtAmount;

    const { upperHint, lowerHint } = await liquityCalcHints({
      collateralAmount: nextCollateralAmount,
      debtAmount: nextDebtAmount,
      liquityHintHelper,
      liquitySortedTroves,
    });

    const addCollateralReceipt = await liquityDebtPositionAddCollateral({
      collateralAmount: collateralToAddAmount,
      comptrollerProxy: comptrollerProxyUsed,
      externalPositionManager: fork.deployment.externalPositionManager,
      externalPositionProxy: liquityDebtPosition,
      lowerHint,
      signer: fundOwner,
      upperHint,
    });

    const getManagedAssetsCall = await liquityDebtPosition.getManagedAssets.call();

    expect(getManagedAssetsCall).toMatchFunctionOutput(liquityDebtPosition.getManagedAssets.fragment, {
      amounts_: [nextCollateralAmount],
      assets_: [weth],
    });

    // Actual gas spent varies based on the accuracy of the hint values
    expect(addCollateralReceipt).toMatchInlineGasSnapshot('417178', gasAssertionTolerance);
  });
});

describe('removeCollateral', () => {
  it('works as expected', async () => {
    await liquityDebtPositionOpenTrove({
      collateralAmount: wethBaseCollateralAmount,
      comptrollerProxy: comptrollerProxyUsed,
      externalPositionManager: fork.deployment.externalPositionManager,
      externalPositionProxy: liquityDebtPosition,
      lowerHint: openTroveLowerHint,
      lusdAmount: lusdBaseBorrowAmount,
      maxFeePercentage,
      signer: fundOwner,
      upperHint: openTroveUpperHint,
    });

    // Calc total debt amount from OpenTrove
    const openTroveFeeAmount = await liquityTroveManager.getBorrowingFee.args(lusdBaseBorrowAmount).call();
    const openTroveDebtAmount = lusdBaseBorrowAmount.add(liquityLiquidationReserve).add(openTroveFeeAmount);

    // Decrease the collateral slightly, so as to not move the collateralization ratio much
    const collateralToRemoveAmount = wethBaseCollateralAmount.mul(ONE_PERCENT_IN_BPS).div(ONE_HUNDRED_PERCENT_IN_BPS);
    const nextCollateralAmount = wethBaseCollateralAmount.sub(collateralToRemoveAmount);
    const nextDebtAmount = openTroveDebtAmount;

    const wethBalanceBefore = await weth.balanceOf(vaultProxyUsed);

    const { upperHint, lowerHint } = await liquityCalcHints({
      collateralAmount: nextCollateralAmount,
      debtAmount: nextDebtAmount,
      liquityHintHelper,
      liquitySortedTroves,
    });

    const removeCollateralReceipt = await liquityDebtPositionRemoveCollateral({
      collateralAmount: collateralToRemoveAmount,
      comptrollerProxy: comptrollerProxyUsed,
      externalPositionManager: fork.deployment.externalPositionManager,
      externalPositionProxy: liquityDebtPosition,
      lowerHint,
      signer: fundOwner,
      upperHint,
    });

    const wethBalanceAfter = await weth.balanceOf(vaultProxyUsed);

    const getManagedAssetsCall = await liquityDebtPosition.getManagedAssets.call();

    expect(getManagedAssetsCall).toMatchFunctionOutput(liquityDebtPosition.getManagedAssets.fragment, {
      amounts_: [nextCollateralAmount],
      assets_: [weth],
    });

    expect(wethBalanceAfter).toEqBigNumber(wethBalanceBefore.add(collateralToRemoveAmount));

    // Actual gas spent varies based on the accuracy of the hint values
    expect(removeCollateralReceipt).toMatchInlineGasSnapshot('451619', gasAssertionTolerance);
  });
});

describe('borrowLusd', () => {
  it('works as expected', async () => {
    await liquityDebtPositionOpenTrove({
      collateralAmount: wethBaseCollateralAmount,
      comptrollerProxy: comptrollerProxyUsed,
      externalPositionManager: fork.deployment.externalPositionManager,
      externalPositionProxy: liquityDebtPosition,
      lowerHint: openTroveLowerHint,
      lusdAmount: lusdBaseBorrowAmount,
      maxFeePercentage,
      signer: fundOwner,
      upperHint: openTroveUpperHint,
    });

    // Calc total debt amount from OpenTrove
    const openTroveFeeAmount = await liquityTroveManager.getBorrowingFee.args(lusdBaseBorrowAmount).call();
    const openTroveDebtAmount = lusdBaseBorrowAmount.add(liquityLiquidationReserve).add(openTroveFeeAmount);

    // Increase the borrowed amount slightly, so as to not move the collateralization ratio much
    const borrowedAmountToAdd = lusdBaseBorrowAmount.mul(ONE_PERCENT_IN_BPS).div(ONE_HUNDRED_PERCENT_IN_BPS);
    const nextCollateralAmount = wethBaseCollateralAmount;
    const newFeeAmountEstimate = await liquityTroveManager.getBorrowingFee.args(borrowedAmountToAdd).call();

    const { upperHint, lowerHint } = await liquityCalcHints({
      collateralAmount: nextCollateralAmount,
      debtAmount: openTroveDebtAmount.add(borrowedAmountToAdd).add(newFeeAmountEstimate),
      liquityHintHelper,
      liquitySortedTroves,
    });

    const borrowLusdReceipt = await liquityDebtPositionBorrow({
      comptrollerProxy: comptrollerProxyUsed,
      externalPositionManager: fork.deployment.externalPositionManager,
      externalPositionProxy: liquityDebtPosition,
      lowerHint,
      lusdAmount: borrowedAmountToAdd,
      maxFeePercentage,
      signer: fundOwner,
      upperHint,
    });

    const newFeeAmount = await liquityTroveManager.getBorrowingFee.args(borrowedAmountToAdd).call();

    const getDebtAssetsCall = await liquityDebtPosition.getDebtAssets.call();

    expect(getDebtAssetsCall).toMatchFunctionOutput(liquityDebtPosition.getDebtAssets.fragment, {
      amounts_: [openTroveDebtAmount.add(borrowedAmountToAdd).add(newFeeAmount)],
      assets_: [lusd],
    });

    // Actual gas spent varies based on the accuracy of the hint values
    expect(borrowLusdReceipt).toMatchInlineGasSnapshot('415231', gasAssertionTolerance);
  });
});

describe('closeTrove', () => {
  it('works as expected', async () => {
    // Seed the vault with some LUSD in order to have enough to close trove
    await lusd.transfer(vaultProxyUsed, lusdBaseBorrowAmount.mul(2));

    await liquityDebtPositionOpenTrove({
      collateralAmount: wethBaseCollateralAmount,
      comptrollerProxy: comptrollerProxyUsed,
      externalPositionManager: fork.deployment.externalPositionManager,
      externalPositionProxy: liquityDebtPosition,
      lowerHint: openTroveLowerHint,
      lusdAmount: lusdBaseBorrowAmount,
      maxFeePercentage,
      signer: fundOwner,
      upperHint: openTroveUpperHint,
    });

    const getDebtAssetsCallBefore = await liquityDebtPosition.getDebtAssets.call();
    const wethBalanceBefore = await weth.balanceOf(vaultProxyUsed);
    const lusdBalanceBefore = await lusd.balanceOf(vaultProxyUsed);

    const closeTroveReceipt = await liquityDebtPositionCloseTrove({
      comptrollerProxy: comptrollerProxyUsed,
      externalPositionManager: fork.deployment.externalPositionManager,
      externalPositionProxy: liquityDebtPosition,
      signer: fundOwner,
    });

    const wethBalanceAfter = await weth.balanceOf(vaultProxyUsed);
    const lusdBalanceAfter = await lusd.balanceOf(vaultProxyUsed);

    expect(wethBalanceAfter.sub(wethBalanceBefore)).toEqBigNumber(wethBaseCollateralAmount);

    expect(lusdBalanceBefore.sub(lusdBalanceAfter)).toEqBigNumber(
      getDebtAssetsCallBefore.amounts_[0].sub(liquityLiquidationReserve),
    );

    const getDebtAssetsCallAfter = await liquityDebtPosition.getDebtAssets.call();
    const getManagedAssetsCallAfter = await liquityDebtPosition.getManagedAssets.call();

    expect(getDebtAssetsCallAfter).toMatchFunctionOutput(liquityDebtPosition.getDebtAssets.fragment, {
      amounts_: [],
      assets_: [],
    });

    expect(getManagedAssetsCallAfter).toMatchFunctionOutput(liquityDebtPosition.getDebtAssets.fragment, {
      amounts_: [],
      assets_: [],
    });

    // Actual gas spent varies based on the accuracy of the hint values
    expect(closeTroveReceipt).toMatchInlineGasSnapshot('438847', gasAssertionTolerance);
  });
});

describe('repayBorrow', () => {
  it('works as expected', async () => {
    await liquityDebtPositionOpenTrove({
      collateralAmount: wethBaseCollateralAmount,
      comptrollerProxy: comptrollerProxyUsed,
      externalPositionManager: fork.deployment.externalPositionManager,
      externalPositionProxy: liquityDebtPosition,
      lowerHint: openTroveLowerHint,
      lusdAmount: lusdBaseBorrowAmount,
      maxFeePercentage,
      signer: fundOwner,
      upperHint: openTroveUpperHint,
    });

    // Calc total debt amount from OpenTrove
    const openTroveFeeAmount = await liquityTroveManager.getBorrowingFee.args(lusdBaseBorrowAmount).call();
    const openTroveDebtAmount = lusdBaseBorrowAmount.add(liquityLiquidationReserve).add(openTroveFeeAmount);

    // Decrease the borrowed amount slightly, so as to not move the collateralization ratio much
    const borrowedAmountToRepay = lusdBaseBorrowAmount.mul(ONE_PERCENT_IN_BPS).div(ONE_HUNDRED_PERCENT_IN_BPS);
    const nextCollateralAmount = wethBaseCollateralAmount;
    const nextDebtAmount = openTroveDebtAmount.sub(borrowedAmountToRepay);

    const { upperHint, lowerHint } = await liquityCalcHints({
      collateralAmount: nextCollateralAmount,
      debtAmount: nextDebtAmount,
      liquityHintHelper,
      liquitySortedTroves,
    });

    const repayBorrowReceipt = await liquityDebtPositionRepay({
      comptrollerProxy: comptrollerProxyUsed,
      externalPositionManager: fork.deployment.externalPositionManager,
      externalPositionProxy: liquityDebtPosition,
      lowerHint,
      lusdAmount: borrowedAmountToRepay,
      signer: fundOwner,
      upperHint,
    });

    const getDebtAssetsCall = await liquityDebtPosition.getDebtAssets.call();

    expect(getDebtAssetsCall).toMatchFunctionOutput(liquityDebtPosition.getDebtAssets.fragment, {
      amounts_: [nextDebtAmount],
      assets_: [lusd],
    });

    // Actual gas spent varies based on the accuracy of the hint values
    expect(repayBorrowReceipt).toMatchInlineGasSnapshot('391578', gasAssertionTolerance);
  });
});
