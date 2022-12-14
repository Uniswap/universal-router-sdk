# universal-router-sdk
This SDK facilitates interactions with the contracts in [Universal Router](https://github.com/Uniswap/universal-router)

## Usage
Install latest version of universal-router-sdk. Then import the corresponding Trade class and Data object for each protocol you'd like to interact with.

### Trading NFTs
warning: `swapNFTCallParameters()` to be deprecated in favor of `swapCallParameters()`
```typescript
import {
  LooksRareTrade,
  LooksRareData,
  SeaportTrade,
  SeaportData
} from "@uniswap/universal-router-sdk";

// Each protocol data object contains 1 call to that protocol. Some protocols can fit
// many NFT purchase within 1 call, like seaport. Others require multiple calls per NFT (like LooksRare).
const looksRareTrades = new LooksRareTrade([looksrareData1, looksrareData2])
const seaportTrades = new SeaportTrade([seaportData1])

// Use the raw calldata and value returned to call into Universal Swap Router contracts
// Trades will happen in the order that they are handed in
const { calldata, value } = SwapRouter.swapCallParameters([looksRareTrades, seaportTrades])
```

### Trading ERC20s on Uniswap
warning: `swapERC20CallParameters()` to be deprecated in favor of `swapcallParameters()`
```typescript
import { TradeType } from '@uniswap/sdk-core'
import { Trade as V2TradeSDK } from '@uniswap/v2-sdk'
import { Trade as V3TradeSDK } from '@uniswap/v3-sdk'
import { MixedRouteTrade, MixedRouteSDK, Trade as RouterTrade } from '@uniswap/router-sdk'

const options = { slippageTolerance, recipient }
const routerTrade = new UniswapTrade(
  new RouterTrade({ v2Routes, v3Routes, mixedRoutes, tradeType: TradeType.EXACT_INPUT },
  options
)
// Use the raw calldata and value returned to call into Universal Swap Router contracts
const { calldata, value } = SwapRouter.swapCallParameters([routerTrade])
```

### Using Uniswap for ERC20 NFT Trades
```typescript
import { TradeType } from '@uniswap/sdk-core'
import { Trade as V2TradeSDK } from '@uniswap/v2-sdk'
import { Trade as V3TradeSDK } from '@uniswap/v3-sdk'
import { MixedRouteTrade, MixedRouteSDK, Trade as RouterTrade } from '@uniswap/router-sdk'
import {
  UniswapTrade,
  LooksRareTrade,
  LooksRareData,
  SeaportTrade,
  SeaportData
} from "@uniswap/universal-router-sdk";

const looksRareTrades = new LooksRareTrade([looksrareData1, looksrareData2])
const seaportTrades = new SeaportTrade([seaportData1])
const options = { slippageTolerance, recipient }
const uniswapTrade = new UniswapTrade(
  new RouterTrade({ v2Routes, v3Routes, mixedRoutes, tradeType: TradeType.EXACT_INPUT }),
  options
)
// Use the raw calldata and value returned to call into Universal Swap Router contracts
const { calldata, value } = SwapRouter.swapCallParameters([uniswapTrade, seaportTrades, looksRareTrades])
```


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
