pragma solidity ^0.4.21;
pragma experimental ABIEncoderV2;

import "Accounting.sol";
import "FeeManager.sol";
import "Hub.sol";
import "PolicyManager.sol";
import "Participation.sol";
import "Shares.sol";
import "Trading.sol";
import "Vault.sol";
import "Version.i.sol";
import "AmguConsumer.sol";

// TODO: inherit from Factory
/// @notice Creates fund components and links them together
contract FundFactory is AmguConsumer {

    event NewFund(
        address manager,
        address hub,
        address[12] components
    );

    address public factoryPriceSource;
    address public mlnAddress;
    VersionInterface public version;
    address public engine;
    address public registry;
    AccountingFactory public accountingFactory;
    FeeManagerFactory public feeManagerFactory;
    ParticipationFactory public participationFactory;
    PolicyManagerFactory public policyManagerFactory;
    SharesFactory public sharesFactory;
    TradingFactory public tradingFactory;
    VaultFactory public vaultFactory;

    struct Components {
        address accounting;
        address feeManager;
        address participation;
        address policyManager;
        address shares;
        address trading;
        address vault;
        address priceSource;
        address registry;
        address version;
        address engine;
        address mlnAddress;
    }

    address[] public funds;
    mapping (address => bool) public hubExists;
    mapping (address => address) public managersToHubs;
    mapping (address => Components) public managersToComponents;
    // Only used internally
    mapping (address => Settings) public managersToSettings;
    mapping (address => uint8) public stepFor;

    struct Settings {
        string name;
        address[] exchanges;
        address[] adapters;
        address quoteAsset;
        address nativeAsset;
        address[] defaultAssets;
        bool[] takesCustody;
        address priceSource;
    }

    modifier step(uint8 n) {
        require(stepFor[msg.sender] == n - 1, "Previous step incomplete");
        _;
        stepFor[msg.sender] = n;
    }

    constructor(
        address _accountingFactory,
        address _feeManagerFactory,
        address _participationFactory,
        address _sharesFactory,
        address _tradingFactory,
        address _vaultFactory,
        address _policyManagerFactory,
        address _version,
        address _engine,
        address _factoryPriceSource,
        address _mlnAddress
    ) {
        accountingFactory = AccountingFactory(_accountingFactory);
        feeManagerFactory = FeeManagerFactory(_feeManagerFactory);
        participationFactory = ParticipationFactory(_participationFactory);
        sharesFactory = SharesFactory(_sharesFactory);
        tradingFactory = TradingFactory(_tradingFactory);
        vaultFactory = VaultFactory(_vaultFactory);
        policyManagerFactory = PolicyManagerFactory(_policyManagerFactory);
        version = VersionInterface(_version);
        engine = Engine(_engine);
        factoryPriceSource = _factoryPriceSource;
        mlnAddress = _mlnAddress;
    }

    // TODO: improve naming
    function createComponents(
        string _name,
        // address _compliance,
        // address[] _policies,
        FeeManager.FeeInfo[] _fees,
        address[] _exchanges,
        address[] _adapters,
        address _quoteAsset,
        address _nativeAsset,
        address[] _defaultAssets,
        bool[] _takesCustody,
        address _priceSource
    ) public payable step(1) amguPayable {
        managersToHubs[msg.sender] = new Hub(msg.sender, _name);
        managersToSettings[msg.sender] = Settings(
            _name,
            _exchanges,
            _adapters,
            _quoteAsset,
            _nativeAsset,
            _defaultAssets,
            _takesCustody,
            _priceSource
        );
        managersToComponents[msg.sender].accounting = accountingFactory.createInstance(managersToHubs[msg.sender], managersToSettings[msg.sender].nativeAsset, managersToSettings[msg.sender].quoteAsset, managersToSettings[msg.sender].defaultAssets);
        managersToComponents[msg.sender].feeManager = feeManagerFactory.createInstance(managersToHubs[msg.sender], _fees);
        managersToComponents[msg.sender].registry = registry;
        managersToComponents[msg.sender].participation = participationFactory.createInstance(
            managersToHubs[msg.sender],
            managersToSettings[msg.sender].defaultAssets,
            managersToComponents[msg.sender].registry
        );
    }

    // TODO: improve naming
    function continueCreation() public payable step(2) amguPayable {
        Hub hub = Hub(managersToHubs[msg.sender]);
        managersToComponents[msg.sender].policyManager = policyManagerFactory.createInstance(managersToHubs[msg.sender]);
        managersToComponents[msg.sender].shares = sharesFactory.createInstance(managersToHubs[msg.sender]);
        managersToComponents[msg.sender].trading = tradingFactory.createInstance(
            managersToHubs[msg.sender],
            managersToSettings[msg.sender].exchanges,
            managersToSettings[msg.sender].adapters,
            managersToSettings[msg.sender].takesCustody,
            managersToComponents[msg.sender].registry
        );
        managersToComponents[msg.sender].vault = vaultFactory.createInstance(managersToHubs[msg.sender]);
        managersToComponents[msg.sender].priceSource = managersToSettings[msg.sender].priceSource;
        managersToComponents[msg.sender].version = address(version);
        managersToComponents[msg.sender].engine = engine;
        managersToComponents[msg.sender].mlnAddress = mlnAddress;
    }

    // TODO: improve naming
    function setupFund() public payable step(3) amguPayable {
        Components components = managersToComponents[msg.sender];
        Hub hub = Hub(managersToHubs[msg.sender]);
        hubExists[address(hub)] = true;
        hub.setSpokes([
            components.accounting,
            components.feeManager,
            components.participation,
            components.policyManager,
            components.shares,
            components.trading,
            components.vault,
            components.priceSource,
            components.registry,
            components.version,
            components.engine,
            components.mlnAddress
        ]);
        hub.setRouting();
        hub.setPermissions();
        funds.push(hub);

        delete managersToSettings[msg.sender];

        emit NewFund(
            msg.sender,
            hub,
            [
                components.accounting,
                components.feeManager,
                components.participation,
                components.policyManager,
                components.shares,
                components.trading,
                components.vault,
                components.priceSource,
                components.registry,
                components.version,
                components.engine,
                components.mlnAddress
            ]
        );
    }

    function getFundById(uint withId) public view returns (address) { return funds[withId]; }
    function getLastFundId() public view returns (uint) { return funds.length - 1; }

    function engine() view returns (address) { return address(engine); }
    function mlnAddress() view returns (address) { return address(mlnAddress); }
    function priceSource() view returns (address) { return address(factoryPriceSource); }
    function version() view returns (address) { return address(version); }
}

