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
warning: `swapERC20CallParameters()` to be deprecated in favor of `swapCallParameters()`
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
const { calldata, value } = SwapRouter.swapCallParameters(routerTrade)
```

### Using Uniswap for ERC20 NFT Trades
Send ETH to the router by trading an ERC20 for ETH with a Uniswap Trade and encoding the swap recipient as `ROUTER_AS_RECIPIENT` in the trade. Then subsequently list the NFT trades to use the ETH output to buy NFTs. Trades happen in the order they are listed.

Use `trade_type: TradeType.EXACT_OUTPUT` to cover the entire NFT price, alternatively the transaction will send supplemental ETH to fulfill the entire price if the swap does not cover it in full. Keep in mind that `TradeType.EXACT_INPUT` trades are subject to slippage on output, and ETH will be sent to cover potential slippage and any remaining ETH will be returned to sender.
```typescript
import { TradeType } from '@uniswap/sdk-core'
import { Trade as V2TradeSDK } from '@uniswap/v2-sdk'
import { Trade as V3TradeSDK } from '@uniswap/v3-sdk'
import { MixedRouteTrade, MixedRouteSDK, Trade as RouterTrade } from '@uniswap/router-sdk'
import {
  ROUTER_AS_RECIPIENT,
  UniswapTrade,
  LooksRareTrade,
  LooksRareData,
  SeaportTrade,
  SeaportData
} from "@uniswap/universal-router-sdk";

const looksRareTrades = new LooksRareTrade([looksrareData1, looksrareData2])
const seaportTrades = new SeaportTrade([seaportData1])
// WARNING: never send funds to ROUTER_AS_RECIPIENT unless it is ETH that will be used in NFT trades, otherwise funds are lost.
const uniswapTrade = new UniswapTrade(
  new RouterTrade({ v2Routes, v3Routes, mixedRoutes, tradeType: TradeType.EXACT_OUTPUT }),
  { slippageTolerance, recipient:  ROUTER_AS_RECIPIENT}
)
// Use the raw calldata and value returned to call into Universal Swap Router contracts
const { calldata, value } = SwapRouter.swapCallParameters([uniswapTrade, seaportTrades, looksRareTrades])
```

### Using WETH for NFT Trades
The current router purchases all NFTs with ETH, but you can send WETH to the router to be unwrapped for ETH right before the NFT commands. Similar to ERC20 Uniswap Trades for NFTs, supplemental ETH will be sent in the transaction if the WETH amount will not cover the NFT buys. You can also use ERC20s and WETH to cover the transaction by including both commands before the NFT purchase.

```typescript
import {
  ROUTER_AS_RECIPIENT,
  UniswapTrade,
  LooksRareTrade,
  LooksRareData,
  SeaportTrade,
  SeaportData
} from "@uniswap/universal-router-sdk";

const looksRareTrades = new LooksRareTrade([looksrareData1, looksrareData2])
const seaportTrades = new SeaportTrade([seaportData1])
// if no Permit needed, omit the third var of type Permit2Permit
const unwrapWETH = new UnwrapWETH(amountWETH, chainId, optionalPermit2Params)

// Use the raw calldata and value returned to call into Universal Swap Router contracts
const { calldata, value } = SwapRouter.swapCallParameters([unwrapWETH, seaportTrades, looksRareTrades])
```

### Trading stETH
To trade stETH as an input token, you can make sure the router automatically wraps stETH to wstETH before trading across a wstETH route. Make sure to specify the router is the payer of the swap (since it's in custody of wSTETH after wrapping)

If this is an exactOut trade, we'll need to wrap the maximumAmountIn of steth, and therefore should add an unwrap command at the end of the transaction to account for any leftover steth that didn't get traded. `amountMinimum` can be set to 0 in this scenario for the unwrapSteth commmand.
```typescript
import { TradeType } from '@uniswap/sdk-core'
import { Trade as V2TradeSDK } from '@uniswap/v2-sdk'
import { Trade as V3TradeSDK } from '@uniswap/v3-sdk'
import { MixedRouteTrade, MixedRouteSDK, Trade as RouterTrade } from '@uniswap/router-sdk'
import {
  UniswapTrade,
  WrapSTETH
} from "@uniswap/universal-router-sdk";

// EXACT INPUT
// including optional permit2 parameter will transfer STETH amount using permit2
const wrapSTETH = new WrapSTETH(inputSTETH, chainId, WrapSTETHPermitData?, wrapAmountOtherThanContractBalance?)
const uniswapWstethTrade = new UniswapTrade(
  new RouterTrade({ v2Routes, v3Routes, mixedRoutes, tradeType: TradeType.EXACT_INPUT }),
  { slippageTolerance, payerIsRouter: true }
)
const { calldata, value } = SwapRouter.swapCallParameters([wrapSTETH, uniswapWstethTrade])

// EXACT OUTPUT
const wrapSTETH = new WrapSTETH(maximumInputSTETH, chainId, WrapSTETHPermitData?, wrapAmountOtherThanContractBalance?)
const uniswapWstethTrade = new UniswapTrade(
  new RouterTrade({ v2Routes, v3Routes, mixedRoutes, tradeType: TradeType.EXACT_OUTPUT }),
  { slippageTolerance, payerIsRouter: true }
)
const unwrapSTETH = new UnwrapSTETH(recipient, amountMinimum = 0, chainId)

const { calldata, value } = SwapRouter.swapCallParameters([wrapSTETH, uniswapWstethTrade, unwrapSTETH])

```

To recieve stETH as an output token, you can make sure the router automatically unwraps wstETH to stETH before returning to the swapper
```typescript
import { TradeType } from '@uniswap/sdk-core'
import { Trade as V2TradeSDK } from '@uniswap/v2-sdk'
import { Trade as V3TradeSDK } from '@uniswap/v3-sdk'
import { MixedRouteTrade, MixedRouteSDK, Trade as RouterTrade } from '@uniswap/router-sdk'
import {
  ROUTER_AS_RECIPIENT,
  UniswapTrade,
  UnwrapSTETH
} from "@uniswap/universal-router-sdk";

// return trade to the router instead of the recipient using the ROUTER_AS_RECIPIENT constant so that the router may custody tokens to unwrap
const uniswapWstethTrade = new UniswapTrade(
  new RouterTrade({ v2Routes, v3Routes, mixedRoutes, tradeType: TradeType.EXACT_INPUT }),
  { slippageTolerance, recipient: ROUTER_AS_RECIPIENT}
)
const unwrapSTETH = new UnwrapSTETH(recipient, amountMinimum, chainId)

const { calldata, value } = SwapRouter.swapCallParameters([uniswapWstethTrade, unwrapSTETH])
```


## Running this package
Create `.env` file with forking url

```
FORK_URL='xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
```

Make sure you are running `node v16`
Install dependencies and run typescript unit tests
```bash
yarn install
yarn test:hardhat
```

Run forge integration tests
```bash
yarn symlink # must install git submodules
forge install
yarn test:forge
```
