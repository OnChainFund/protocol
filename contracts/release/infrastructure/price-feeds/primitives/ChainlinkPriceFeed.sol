// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.6.8;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "../../../interfaces/IChainlinkAggregator.sol";
import "../../utils/DispatcherOwnerMixin.sol";
import "./utils/PrimitivePriceFeedBase.sol";

/// @title ChainlinkPriceFeed Contract
/// @author Melon Council DAO <security@meloncoucil.io>
/// @notice A price feed that uses Chainlink oracles as price sources
contract ChainlinkPriceFeed is PrimitivePriceFeedBase, DispatcherOwnerMixin {
    using SafeMath for uint256;

    event AggregatorUpdated(
        address indexed primitive,
        address prevAggregator,
        address nextAggregator
    );

    event EthUsdAggregatorSet(address prevEthUsdAggregator, address nextEthUsdAggregator);

    event PrimitiveAdded(address indexed primitive, address aggregator, RateAsset rateAsset);

    event PrimitiveRemoved(address indexed primitive);

    event StaleRateThresholdSet(uint256 prevStaleRateThreshold, uint256 nextStaleRateThreshold);

    enum RateAsset {ETH, USD}

    struct AggregatorInfo {
        address aggregator;
        RateAsset rateAsset;
    }

    uint256 private constant ETH_PRECISION = 18;
    uint256 private constant FEED_PRECISION = 18;
    address private immutable WETH_TOKEN;

    address private ethUsdAggregator;
    uint256 private staleRateThreshold;
    mapping(address => AggregatorInfo) private primitiveToAggregatorInfo;

    constructor(
        address _dispatcher,
        address _wethToken,
        address _ethUsdAggregator,
        uint256 _staleRateThreshold,
        address[] memory _primitives,
        address[] memory _aggregators,
        RateAsset[] memory _rateAssets
    ) public DispatcherOwnerMixin(_dispatcher) {
        WETH_TOKEN = _wethToken;
        __setStaleRateThreshold(_staleRateThreshold);
        __setEthUsdAggregator(_ethUsdAggregator);
        __addPrimitives(_primitives, _aggregators, _rateAssets);
    }

    // EXTERNAL FUNCTIONS

    /// @notice Adds a list of primitives with the given aggregator and rateAsset values
    /// @param _primitives The primitives to add
    /// @param _aggregators The ordered aggregators corresponding to the list of _primitives
    /// @param _rateAssets The ordered rate assets corresponding to the list of _primitives
    function addPrimitives(
        address[] calldata _primitives,
        address[] calldata _aggregators,
        RateAsset[] calldata _rateAssets
    ) external onlyDispatcherOwner {
        __addPrimitives(_primitives, _aggregators, _rateAssets);
    }

    /// @notice Gets the canonical conversion rate for a pair of assets
    /// @param _baseAsset The base asset
    /// @param _quoteAsset The quote asset
    /// @return rate_ The conversion rate
    /// @return isValid_ True if the rate is deemed valid
    function getCanonicalRate(address _baseAsset, address _quoteAsset)
        public
        view
        override
        returns (uint256 rate_, bool isValid_)
    {
        if (_baseAsset == _quoteAsset) {
            return (10**FEED_PRECISION, true);
        }

        // Get the latest rate data for each asset and return early if there is an invalid rate
        (int256 baseAssetRate, uint256 baseAssetRateTimestamp) = __getLatestRateData(_baseAsset);
        if (baseAssetRate <= 0) {
            return (0, false);
        }

        (int256 quoteAssetRate, uint256 quoteAssetRateTimestamp) = __getLatestRateData(
            _quoteAsset
        );
        if (quoteAssetRate <= 0) {
            return (0, false);
        }

        rate_ = __calcConversionRate(
            _baseAsset,
            uint256(baseAssetRate),
            _quoteAsset,
            uint256(quoteAssetRate)
        );
        if (rate_ == 0) {
            return (0, false);
        }

        // Check the timestamps to confirm rate validity.
        // The rate is only considered valid if the difference between the current block time
        // and the oldest timestamp of the two rates is less than the defined threshold.
        uint256 oldestTimestamp;
        if (baseAssetRateTimestamp > quoteAssetRateTimestamp) {
            oldestTimestamp = quoteAssetRateTimestamp;
        } else {
            oldestTimestamp = baseAssetRateTimestamp;
        }
        if (block.timestamp.sub(oldestTimestamp) <= staleRateThreshold) {
            isValid_ = true;
        }

        return (rate_, isValid_);
    }

    /// @notice Gets the live conversion rate for a pair of assets
    /// @param _baseAsset The base asset
    /// @param _quoteAsset The quote asset
    /// @return rate_ The conversion rate
    /// @return isValid_ True if the rate is deemed valid
    /// @dev Live and canonical rates are the same for Chainlink
    function getLiveRate(address _baseAsset, address _quoteAsset)
        external
        view
        override
        returns (uint256 rate_, bool isValid_)
    {
        return getCanonicalRate(_baseAsset, _quoteAsset);
    }

    /// @notice Checks whether an asset is a supported primitive of the price feed
    /// @param _asset The asset to check
    /// @return isSupported_ True if the asset is a supported primitive
    function isSupportedAsset(address _asset) external view override returns (bool isSupported_) {
        return _asset == WETH_TOKEN || primitiveToAggregatorInfo[_asset].aggregator != address(0);
    }

    /// @notice Removes a list of primitives from the feed
    /// @param _primitives The primitives to remove
    function removePrimitives(address[] calldata _primitives) external onlyDispatcherOwner {
        for (uint256 i; i < _primitives.length; i++) {
            delete primitiveToAggregatorInfo[_primitives[i]];
        }
    }

    /// @notice Sets the `ehUsdAggregator` variable value
    /// @param _nextEthUsdAggregator The `ehUsdAggregator` value to set
    function setEthUsdAggregator(address _nextEthUsdAggregator) external onlyDispatcherOwner {
        __setEthUsdAggregator(_nextEthUsdAggregator);
    }

    /// @notice Sets the `staleRateThreshold` variable
    /// @param _nextStaleRateThreshold The next `staleRateThreshold` value
    function setStaleRateThreshold(uint256 _nextStaleRateThreshold) external onlyDispatcherOwner {
        __setStaleRateThreshold(_nextStaleRateThreshold);
    }

    /// @notice Updates the aggregators for given primitives
    /// @param _primitives The primitives to update
    /// @param _aggregators The ordered aggregators corresponding to the list of _primitives
    function updateAggregators(address[] calldata _primitives, address[] calldata _aggregators)
        external
        onlyDispatcherOwner
    {
        require(_primitives.length > 0, "updateAggregators: _primitives cannot be empty");
        require(
            _primitives.length == _aggregators.length,
            "updateAggregators: Unequal _primitives and _aggregators array lengths"
        );

        for (uint256 i; i < _primitives.length; i++) {
            address prevAggregator = primitiveToAggregatorInfo[_primitives[i]].aggregator;
            require(_aggregators[i] != prevAggregator, "updateAggregators: Value already set");

            __validateAggregator(_aggregators[i]);

            primitiveToAggregatorInfo[_primitives[i]].aggregator = _aggregators[i];

            emit AggregatorUpdated(_primitives[i], prevAggregator, _aggregators[i]);
        }
    }

    // PRIVATE FUNCTIONS

    /// @dev Helper to add primitives to the feed
    function __addPrimitives(
        address[] memory _primitives,
        address[] memory _aggregators,
        RateAsset[] memory _rateAssets
    ) private {
        require(_primitives.length > 0, "__addPrimitives: _primitives cannot be empty");
        require(
            _primitives.length == _aggregators.length,
            "__addPrimitives: Unequal _primitives and _aggregators array lengths"
        );
        require(
            _primitives.length == _rateAssets.length,
            "__addPrimitives: Unequal _primitives and _quoteAssets array lengths"
        );

        for (uint256 i = 0; i < _primitives.length; i++) {
            __validateAggregator(_aggregators[i]);

            primitiveToAggregatorInfo[_primitives[i]] = AggregatorInfo({
                aggregator: _aggregators[i],
                rateAsset: _rateAssets[i]
            });

            emit PrimitiveAdded(_primitives[i], _aggregators[i], _rateAssets[i]);
        }
    }

    /// @dev Helper to calculate the conversion rate from a _baseAsset to a _quoteAsset
    function __calcConversionRate(
        address _baseAsset,
        uint256 _baseAssetRate,
        address _quoteAsset,
        uint256 _quoteAssetRate
    ) private view returns (uint256 rate_) {
        RateAsset baseAssetRateAsset = primitiveToAggregatorInfo[_baseAsset].rateAsset;
        RateAsset quoteAssetRateAsset = primitiveToAggregatorInfo[_quoteAsset].rateAsset;

        // If rates are both in ETH or both in USD
        if (baseAssetRateAsset == quoteAssetRateAsset) {
            return _baseAssetRate.mul(10**FEED_PRECISION).div(_quoteAssetRate);
        }

        int256 usdPerEthRate = IChainlinkAggregator(ethUsdAggregator).latestAnswer();
        if (usdPerEthRate <= 0) {
            return 0;
        }

        // If _baseAsset's rate is in ETH and _quoteAsset's rate is in USD
        if (baseAssetRateAsset == RateAsset.ETH) {
            return _baseAssetRate.mul(uint256(usdPerEthRate)).div(_quoteAssetRate);
        }

        // If _baseAsset's rate is in USD and _quoteAsset's rate is in ETH
        return
            _baseAssetRate
                .mul(10**(FEED_PRECISION.add(ETH_PRECISION)))
                .div(uint256(usdPerEthRate))
                .div(_quoteAssetRate);
    }

    /// @dev Helper to get the latest rate and timestamp for a given primitive
    function __getLatestRateData(address _primitive)
        private
        view
        returns (int256 rate_, uint256 timestamp_)
    {
        if (_primitive == WETH_TOKEN) {
            return (int256(10**ETH_PRECISION), now);
        }

        address aggregator = primitiveToAggregatorInfo[_primitive].aggregator;
        require(aggregator != address(0), "__getLatestRateData: Primitive does not exist");

        IChainlinkAggregator aggregatorContract = IChainlinkAggregator(aggregator);

        return (aggregatorContract.latestAnswer(), aggregatorContract.latestTimestamp());
    }

    /// @dev Helper to set the `ethUsdAggregator` value
    function __setEthUsdAggregator(address _nextEthUsdAggregator) private {
        address prevEthUsdAggregator = ethUsdAggregator;
        require(
            _nextEthUsdAggregator != prevEthUsdAggregator,
            "__setEthUsdAggregator: Value already set"
        );

        __validateAggregator(_nextEthUsdAggregator);

        ethUsdAggregator = _nextEthUsdAggregator;

        emit EthUsdAggregatorSet(prevEthUsdAggregator, _nextEthUsdAggregator);
    }

    /// @dev Helper to set the `staleRateThreshold` variable
    function __setStaleRateThreshold(uint256 _nextStaleRateThreshold) private {
        uint256 prevStaleRateThreshold = staleRateThreshold;
        require(
            _nextStaleRateThreshold != prevStaleRateThreshold,
            "__setStaleRateThreshold: Value already set"
        );

        staleRateThreshold = _nextStaleRateThreshold;

        emit StaleRateThresholdSet(prevStaleRateThreshold, _nextStaleRateThreshold);
    }

    /// @dev Helper to validate an aggregator by checking its return values for the expected interface
    function __validateAggregator(address _aggregator) private view {
        require(_aggregator != address(0), "__validateAggregator: Empty _aggregator");

        IChainlinkAggregator aggregatorContract = IChainlinkAggregator(_aggregator);
        require(aggregatorContract.latestAnswer() > 0, "__validateAggregator: No rate detected");
        require(
            block.timestamp.sub(aggregatorContract.latestTimestamp()) <= staleRateThreshold,
            "__validateAggregator: Stale rate detected"
        );
    }

    ///////////////////
    // STATE GETTERS //
    ///////////////////

    /// @notice Gets the aggregatorInfo variable value for a primitive
    /// @param _primitive The primitive asset for which to get the aggregatorInfo value
    /// @return aggregatorInfo_ The aggregatorInfo value
    function getAggregatorInfoForPrimitive(address _primitive)
        external
        view
        returns (AggregatorInfo memory aggregatorInfo_)
    {
        return primitiveToAggregatorInfo[_primitive];
    }

    /// @notice Gets the `ethUsdAggregator` variable value
    /// @return ethUsdAggregator_ The `ethUsdAggregator` variable value
    function getEthUsdAggregator() external view returns (address ethUsdAggregator_) {
        return ethUsdAggregator;
    }

    /// @notice Gets the `staleRateThreshold` variable value
    /// @return staleRateThreshold_ The `staleRateThreshold` variable value
    function getStaleRateThreshold() external view returns (uint256 staleRateThreshold_) {
        return staleRateThreshold;
    }

    /// @notice Gets the `WETH_TOKEN` variable value
    /// @return wethToken_ The `WETH_TOKEN` variable value
    function getWethToken() external view returns (address wethToken_) {
        return WETH_TOKEN;
    }
}