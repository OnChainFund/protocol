// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.6.8;
pragma experimental ABIEncoderV2;

/// @title PolicyManager Interface
/// @author Melon Council DAO <security@meloncoucil.io>
interface IPolicyManager {
    enum PolicyHook {PreBuyShares, PostBuyShares, PreCallOnIntegration, PostCallOnIntegration}

    function validatePolicies(
        address,
        PolicyHook,
        bytes calldata
    ) external;
}