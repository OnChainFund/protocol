// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.6.8;

/// @title ISynthetixDelegateApprovals Interface
/// @author Melon Council DAO <security@meloncoucil.io>
interface ISynthetixDelegateApprovals {
    function approveExchangeOnBehalf(address) external;

    function canExchangeFor(address, address) external view returns (bool);
}
