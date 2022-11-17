# universal-router-sdk
This SDK facilitates interactions with the contracts in [Universal Router](https://github.com/Uniswap/universal-router)

## Usage
Install latest version of universal-router-sdk. Then import the corresponding Trade class and Data object for each protocol you'd like to interact with.

### Trading NFTs
```typescript
import {
  LooksRareTrade,
  LooksRareData,
  SeaportTrade,
  SeaportData
} from "@uniswap/universal-router-sdk";

const looksRareTrades = new LooksRareTrade([looksrareData1, looksrareData2])
const seaportTrades = new SeaportTrade([seaportData1])

// Use the raw calldata and value returned to call into Universal Swap Router contracts
// Trades will happen in the order that they are handed in
const { calldata, value} = SwapRouter.swapNFTCallParameters([looksRareTrades, seaportTrades], { sender: sender.address })
```

### Trading ERC20s on Uniswap




## Running this package
Make sure you are running `node v16`
Install dependencies and run typescript unit tests
```bash
yarn install
yarn test
```

Run forge integration tests
```bash
yarn symlink # must install git submodules
forge install
forge build
forge test
```
