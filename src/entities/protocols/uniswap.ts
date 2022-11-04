import invariant from 'tiny-invariant'
import { RoutePlanner, CommandType } from '../../utils/routerCommands'
import { Trade as V2Trade, Pair } from '@uniswap/v2-sdk'
import { Trade as V3Trade, Pool, encodeRouteToPath } from '@uniswap/v3-sdk'
import {
  Trade as RouterTrade,
  MixedRouteTrade,
  Protocol,
  IRoute,
  RouteV2,
  RouteV3,
  MixedRouteSDK,
  MixedRoute,
  SwapOptions,
  getOutputOfPools,
  encodeMixedRouteToPath,
  partitionMixedRouteByProtocol,
} from '@uniswap/router-sdk'
import { Currency, TradeType, CurrencyAmount } from '@uniswap/sdk-core'
import { Command } from '../Command'
import { NARWHAL_ADDRESS } from '../../utils/constants'

const WETH = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'

interface Swap<TInput extends Currency, TOutput extends Currency> {
  route: IRoute<TInput, TOutput, Pair | Pool>
  inputAmount: CurrencyAmount<TInput>
  outputAmount: CurrencyAmount<TOutput>
}

// Wrapper for uniswap router-sdk trade entity to encode swaps for Narwhal
// also translates trade objects from previous (v2, v3) SDKs
export class UniswapTrade implements Command {
  // alternative constructor to create from protocol-specific sdks
  static from(
    trades: (
      | V2Trade<Currency, Currency, TradeType>
      | V3Trade<Currency, Currency, TradeType>
      | MixedRouteTrade<Currency, Currency, TradeType>
    )[],
    options: SwapOptions
  ): UniswapTrade {
    invariant(trades.length > 0, 'ZERO_TRADES')
    invariant(
      trades.every((trade) => trade.tradeType == trades[0].tradeType),
      'INCONSISTENT_TRADE_TYPES'
    )

    return new UniswapTrade(
      // RouterTrade constructor handles validation of routes
      new RouterTrade({
        v2Routes: trades
          .filter((trade) => trade instanceof V2Trade)
          .map((trade) => ({
            routev2: trade.route as RouteV2<Currency, Currency>,
            inputAmount: trade.inputAmount,
            outputAmount: trade.outputAmount,
          })),
        v3Routes: trades
          .filter((trade) => trade instanceof V3Trade)
          .map((trade) => ({
            routev3: trade.route as RouteV3<Currency, Currency>,
            inputAmount: trade.inputAmount,
            outputAmount: trade.outputAmount,
          })),
        mixedRoutes: trades
          .filter((trade) => trade instanceof MixedRouteTrade)
          .map((trade) => ({
            mixedRoute: trade.route as MixedRouteSDK<Currency, Currency>,
            inputAmount: trade.inputAmount,
            outputAmount: trade.outputAmount,
          })),
        tradeType: trades[0].tradeType,
      }),
      options
    )
  }

  constructor(public trade: RouterTrade<Currency, Currency, TradeType>, public options: SwapOptions) {}

  encode(planner: RoutePlanner): void {
    let payerIsUser = true
    if (this.trade.inputAmount.currency.isNative) {
      // TODO: opti if only one pool we can directly send this to the pool
      planner.addCommand(CommandType.WRAP_ETH, [NARWHAL_ADDRESS, this.trade.inputAmount.quotient.toString()])
      // since WETH is now owned by the router, the router pays for inputs
      payerIsUser = false
    }

    for (const swap of this.trade.swaps) {
      switch (swap.route.protocol) {
        case Protocol.V2:
          addV2Swap(planner, swap, this.trade.tradeType, this.options, payerIsUser)
          break
        case Protocol.V3:
          addV3Swap(planner, swap, this.trade.tradeType, this.options, payerIsUser)
          break
        case Protocol.MIXED:
          addMixedSwap(planner, swap, this.trade.tradeType, this.options, payerIsUser)
          break
        default:
          throw new Error('UNSUPPORTED_TRADE_PROTOCOL')
      }
    }

    if (this.trade.outputAmount.currency.isNative) {
      planner.addCommand(CommandType.UNWRAP_WETH, [this.options.recipient, this.trade.outputAmount.quotient.toString()])
    }
  }
}

// encode a uniswap v2 swap
function addV2Swap<TInput extends Currency, TOutput extends Currency>(
  planner: RoutePlanner,
  { route, inputAmount, outputAmount }: Swap<TInput, TOutput>,
  tradeType: TradeType,
  options: SwapOptions,
  payerIsUser: boolean
): void {
  const trade = new V2Trade(
    route as RouteV2<TInput, TOutput>,
    tradeType == TradeType.EXACT_INPUT ? inputAmount : outputAmount,
    tradeType
  )

  if (tradeType == TradeType.EXACT_INPUT) {
    // need to explicitly transfer input tokens to the pool as narwhal doesnt handle this for us
    if (payerIsUser) {
      planner.addCommand(CommandType.PERMIT2_TRANSFER_FROM, [
        trade.inputAmount.currency.wrapped.address,
        trade.route.pairs[0].liquidityToken.address,
        trade.inputAmount.quotient.toString(),
      ])
    } else {
      planner.addCommand(CommandType.TRANSFER, [
        trade.inputAmount.currency.wrapped.address,
        trade.route.pairs[0].liquidityToken.address,
        trade.inputAmount.quotient.toString(),
      ])
    }

    planner.addCommand(CommandType.V2_SWAP_EXACT_IN, [
      trade.minimumAmountOut(options.slippageTolerance).quotient.toString(),
      route.path.map((pool) => pool.address),
      // if native, we have to unwrap so keep in the router for now
      trade.outputAmount.currency.isNative ? NARWHAL_ADDRESS : options.recipient,
    ])
  } else if (tradeType == TradeType.EXACT_OUTPUT) {
    planner.addCommand(CommandType.V2_SWAP_EXACT_OUT, [
      trade.minimumAmountOut(options.slippageTolerance).quotient.toString(),
      trade.maximumAmountIn(options.slippageTolerance).quotient.toString(),
      route.path.map((pool) => pool.address),
      trade.outputAmount.currency.isNative ? NARWHAL_ADDRESS : options.recipient,
      payerIsUser,
    ])
  }
}

// encode a uniswap v3 swap
function addV3Swap<TInput extends Currency, TOutput extends Currency>(
  planner: RoutePlanner,
  { route, inputAmount, outputAmount }: Swap<TInput, TOutput>,
  tradeType: TradeType,
  options: SwapOptions,
  payerIsUser: boolean
): void {
  const trade = V3Trade.createUncheckedTrade({
    route: route as RouteV3<TInput, TOutput>,
    inputAmount,
    outputAmount,
    tradeType,
  })

  if (tradeType == TradeType.EXACT_INPUT) {
    // (address recipient, uint256 amountIn, uint256 amountOutMin, bytes memory path, bool payerIsUser)
    planner.addCommand(CommandType.V3_SWAP_EXACT_IN, [
      options.recipient,
      trade.maximumAmountIn(options.slippageTolerance).quotient.toString(),
      trade.minimumAmountOut(options.slippageTolerance).quotient.toString(),
      encodeRouteToPath(route as RouteV3<TInput, TOutput>, trade.tradeType === TradeType.EXACT_INPUT),
      payerIsUser,
    ])
  } else if (tradeType == TradeType.EXACT_OUTPUT) {
    // (address recipient, uint256 amountOut, uint256 amountInMax, bytes memory path, bool payerIsUser)
    planner.addCommand(CommandType.V3_SWAP_EXACT_OUT, [
      options.recipient,
      trade.minimumAmountOut(options.slippageTolerance).quotient.toString(),
      trade.maximumAmountIn(options.slippageTolerance).quotient.toString(),
      encodeRouteToPath(route as RouteV3<TInput, TOutput>, trade.tradeType === TradeType.EXACT_OUTPUT),
      payerIsUser,
    ])
  }
}

// encode a mixed route swap, i.e. including both v2 and v3 pools
function addMixedSwap<TInput extends Currency, TOutput extends Currency>(
  planner: RoutePlanner,
  swap: Swap<TInput, TOutput>,
  tradeType: TradeType,
  options: SwapOptions,
  payerIsUser: boolean
): void {
  const { route, inputAmount, outputAmount } = swap

  // single hop, so it can be reduced to plain v2 or v3 swap logic
  if (route.pools.length === 1) {
    if (route.pools[0] instanceof Pool) {
      return addV3Swap(planner, swap, tradeType, options, payerIsUser)
    } else if (route.pools[0] instanceof Pair) {
      return addV2Swap(planner, swap, tradeType, options, payerIsUser)
    } else {
      throw new Error('Invalid route type')
    }
  }

  const trade = MixedRouteTrade.createUncheckedTrade({
    route: route as MixedRoute<TInput, TOutput>,
    inputAmount,
    outputAmount,
    tradeType,
  })

  const amountIn = trade.maximumAmountIn(options.slippageTolerance, inputAmount).quotient.toString()
  const amountOut = trade.minimumAmountOut(options.slippageTolerance, outputAmount).quotient.toString()

  // logic from
  // https://github.com/Uniswap/router-sdk/blob/d8eed164e6c79519983844ca8b6a3fc24ebcb8f8/src/swapRouter.ts#L276
  const sections = partitionMixedRouteByProtocol(route as MixedRoute<TInput, TOutput>)
  const isLastSectionInRoute = (i: number) => {
    return i === sections.length - 1
  }

  let outputToken
  let inputToken = route.input.wrapped

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i]
    /// Now, we get output of this section
    outputToken = getOutputOfPools(section, inputToken)

    const newRouteOriginal = new MixedRouteSDK(
      [...section],
      section[0].token0.equals(inputToken) ? section[0].token0 : section[0].token1,
      outputToken
    )
    const newRoute = new MixedRoute(newRouteOriginal)

    /// Previous output is now input
    inputToken = outputToken

    const mixedRouteIsAllV3 = (route: MixedRouteSDK<Currency, Currency>) => {
      return route.pools.every((pool) => pool instanceof Pool)
    }

    if (mixedRouteIsAllV3(newRoute)) {
      const path: string = encodeMixedRouteToPath(newRoute)

      planner.addCommand(CommandType.V3_SWAP_EXACT_IN, [
        isLastSectionInRoute(i) ? options.recipient : NARWHAL_ADDRESS, // recipient
        i == 0 ? amountIn : 0, // amountIn
        !isLastSectionInRoute(i) ? 0 : amountOut, // amountOut
        path, // path
        payerIsUser, // payerIsUser
      ])
    } else {
      planner.addCommand(CommandType.V2_SWAP_EXACT_IN, [
        !isLastSectionInRoute(i) ? 0 : amountOut, // amountOutMin
        route.path.map((pool) => pool.address), // path
        isLastSectionInRoute(i) ? options.recipient : NARWHAL_ADDRESS, // recipient
      ])
    }
  }
}
