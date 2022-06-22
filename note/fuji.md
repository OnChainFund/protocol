deploy to fuji

```
yarn deploy:fuji
```

Error

```
An unexpected error occurred:

Error: ERROR processing /Users/lj/Documents/Work/NCHU/OnChainFund/enzyme_original/deploy/scripts/persistent/off-chain/FundValueCalculatorUsdWrapper.ts:
Error: No deployment found for: Config
    at Object.get (/Users/lj/Documents/Work/NCHU/OnChainFund/enzyme_original/node_modules/hardhat-deploy/src/DeploymentsManager.ts:162:17)
    at processTicksAndRejections (node:internal/process/task_queues:96:5)
    at async loadConfig (/Users/lj/Documents/Work/NCHU/OnChainFund/enzyme_original/deploy/utils/config.ts:15:22)
    at async Object.fn [as func] (/Users/lj/Documents/Work/NCHU/OnChainFund/enzyme_original/deploy/scripts/persistent/off-chain/FundValueCalculatorUsdWrapper.ts:13:18)
    at async DeploymentsManager.executeDeployScripts (/Users/lj/Documents/Work/NCHU/OnChainFund/enzyme_original/node_modules/hardhat-deploy/src/DeploymentsManager.ts:1220:22)
    at async DeploymentsManager.runDeploy (/Users/lj/Documents/Work/NCHU/OnChainFund/enzyme_original/node_modules/hardhat-deploy/src/DeploymentsManager.ts:1053:5)
    at async SimpleTaskDefinition.action (/Users/lj/Documents/Work/NCHU/OnChainFund/enzyme_original/node_modules/hardhat-deploy/src/index.ts:422:5)
    at async Environment._runTaskDefinition (/Users/lj/Documents/Work/NCHU/OnChainFund/enzyme_original/node_modules/hardhat/src/internal/core/runtime-environment.ts:217:14)
    at async Environment.run (/Users/lj/Documents/Work/NCHU/OnChainFund/enzyme_original/node_modules/hardhat/src/internal/core/runtime-environment.ts:129:14)
    at async SimpleTaskDefinition.action (/Users/lj/Documents/Work/NCHU/OnChainFund/enzyme_original/node_modules/hardhat-deploy/src/index.ts:568:32)
    at DeploymentsManager.executeDeployScripts (/Users/lj/Documents/Work/NCHU/OnChainFund/enzyme_original/node_modules/hardhat-deploy/src/DeploymentsManager.ts:1223:19)
    at processTicksAndRejections (node:internal/process/task_queues:96:5)
    at async DeploymentsManager.runDeploy (/Users/lj/Documents/Work/NCHU/OnChainFund/enzyme_original/node_modules/hardhat-deploy/src/DeploymentsManager.ts:1053:5)
    at async SimpleTaskDefinition.action (/Users/lj/Documents/Work/NCHU/OnChainFund/enzyme_original/node_modules/hardhat-deploy/src/index.ts:422:5)
    at async Environment._runTaskDefinition (/Users/lj/Documents/Work/NCHU/OnChainFund/enzyme_original/node_modules/hardhat/src/internal/core/runtime-environment.ts:217:14)
    at async Environment.run (/Users/lj/Documents/Work/NCHU/OnChainFund/enzyme_original/node_modules/hardhat/src/internal/core/runtime-environment.ts:129:14)
    at async SimpleTaskDefinition.action (/Users/lj/Documents/Work/NCHU/OnChainFund/enzyme_original/node_modules/hardhat-deploy/src/index.ts:568:32)
    at async Environment._runTaskDefinition (/Users/lj/Documents/Work/NCHU/OnChainFund/enzyme_original/node_modules/hardhat/src/internal/core/runtime-environment.ts:217:14)
    at async Environment.run (/Users/lj/Documents/Work/NCHU/OnChainFund/enzyme_original/node_modules/hardhat/src/internal/core/runtime-environment.ts:129:14)
    at async SimpleTaskDefinition.action (/Users/lj/Documents/Work/NCHU/OnChainFund/enzyme_original/node_modules/hardhat-deploy/src/index.ts:653:5)
error Command failed with exit code 1.
info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.
```

guess: 沒找到 Config
