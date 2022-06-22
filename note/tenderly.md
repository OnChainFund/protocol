## 事前準備

```
//下載tenderly cli
brew tap tenderly/tenderly && brew install tenderly
// 登入
tenderly login
```

## 初始化

```
tenderly init
```

-> 會自動創建 tenderly.yaml 檔案

## 推送至 tenderly

```
tenderly push
```

-> 失敗

```
Compiler version is inconsistent
Some of the project pushes were not successful. Please see the list above
```

下載依賴(hardhat)

```
//下載hardhat-tenderl
npm install --save-dev @tenderly/hardhat-tenderly

// 下載 [hardhat-deploy-tenderly](https://github.com/wighawag/hardhat-deploy-tenderly)
npm install -D hardhat-deploy-tenderly
```

-> 不成功,先找其他簡單的專案,試到成功再說
