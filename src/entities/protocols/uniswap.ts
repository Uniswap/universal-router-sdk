import { RoutePlanner, CommandType } from '../../utils/routerCommands'
import { Trade as V2Trade, Pair } from '@uniswap/v2-sdk'
import { Trade as V3Trade, Pool } from '@uniswap/v3-sdk'
import {
  Trade as RouterTrade,
  MixedRouteTrade,
  Protocol,
  IRoute,
  RouteV2,
  RouteV3,
  MixedRoute,
  SwapOptions,
  partitionMixedRouteByProtocol,
} from '@uniswap/router-sdk'
import { Currency, TradeType, CurrencyAmount, Percent } from '@uniswap/sdk-core'
import { Command } from '../Command'

interface Swap<TInput extends Currency, TOutput extends Currency> {
  route: IRoute<TInput, TOutput, Pair | Pool>
  inputAmount: CurrencyAmount<TInput>
  outputAmount: CurrencyAmount<TOutput>
}

// Wrapper for uniswap router-sdk trade entity to encode swaps for Narwhal
// also translates trade objects from previous (v2, v3) SDKs
export class UniswapTrade implements Command {
  static from(
    trades: (
      | V2Trade<Currency, Currency, TradeType>
      | V3Trade<Currency, Currency, TradeType>
      | MixedRouteTrade<Currency, Currency, TradeType>
    )[],
    options: SwapOptions
  ): UniswapTrade {}

  constructor(public trade: RouterTrade<Currency, Currency, TradeType>, public options: SwapOptions) {}

  encode(planner: RoutePlanner): void {
    // TODO: handle slippage tolerance, i.e. only for last trade?
    // TODO: handle recipient, i.e. keep custody if continuing?
    for (const swap of this.trade.swaps) {
      switch (swap.route.protocol) {
        case Protocol.V2:
          addV2Swap(planner, swap, this.trade.tradeType, this.options)
          break
        case Protocol.V3:
          addV3Swap(planner, swap, this.trade.tradeType, this.options)
          break
        case Protocol.MIXED:
          addMixedSwap(planner, swap, this.trade.tradeType, this.options)
          break
        default:
          throw new Error('UNSUPPORTED_TRADE_PROTOCOL')
      }
    }
  }
}

function addV2Swap<TInput extends Currency, TOutput extends Currency>(
  planner: RoutePlanner,
  { route, inputAmount, outputAmount }: Swap<TInput, TOutput>,
  tradeType: TradeType,
  options: SwapOptions
): void {
  const trade = new V2Trade(
    route as RouteV2<TInput, TOutput>,
    tradeType == TradeType.EXACT_INPUT ? inputAmount : outputAmount,
    tradeType
  )
  const payerIsUser = false

  if (tradeType == TradeType.EXACT_INPUT) {
    // (uint256 amountOutMin, address[] memory path, address recipient)
    planner.addCommand(CommandType.V2_SWAP_EXACT_IN, [
      trade.minimumAmountOut(options.slippageTolerance).quotient,
      route.path.map((pool) => pool.address),
      options.recipient,
    ])
  } else if (tradeType == TradeType.EXACT_OUTPUT) {
    // (uint256 amountOut, uint256 amountInMax, address[] memory path, address recipient, bool payerIsUser)
    planner.addCommand(CommandType.V2_SWAP_EXACT_OUT, [
      trade.minimumAmountOut(options.slippageTolerance).quotient,
      trade.maximumAmountIn(options.slippageTolerance).quotient,
      route.path.map((pool) => pool.address),
      options.recipient,
      payerIsUser,
    ])
  }
}

function addV3Swap<TInput extends Currency, TOutput extends Currency>(
  planner: RoutePlanner,
  { route, inputAmount, outputAmount }: Swap<TInput, TOutput>,
  tradeType: TradeType,
  options: SwapOptions
): void {
  const trade = V3Trade.createUncheckedTrade({
    route: route as RouteV3<TInput, TOutput>,
    inputAmount,
    outputAmount,
    tradeType,
  })
  const payerIsUser = false

  if (tradeType == TradeType.EXACT_INPUT) {
    // (address recipient, uint256 amountIn, uint256 amountOutMin, bytes memory path, bool payerIsUser)
    planner.addCommand(CommandType.V3_SWAP_EXACT_IN, [
      options.recipient,
      trade.maximumAmountIn(options.slippageTolerance).quotient,
      trade.minimumAmountOut(options.slippageTolerance).quotient,
      route.path.map((pool) => pool.address),
      payerIsUser,
    ])
  } else if (tradeType == TradeType.EXACT_OUTPUT) {
    // (address recipient, uint256 amountOut, uint256 amountInMax, bytes memory path, bool payerIsUser)
    planner.addCommand(CommandType.V3_SWAP_EXACT_OUT, [
      options.recipient,
      trade.minimumAmountOut(options.slippageTolerance).quotient,
      trade.maximumAmountIn(options.slippageTolerance).quotient,
      route.path.map((pool) => pool.address),
      payerIsUser,
    ])
  }
}

function addMixedSwap<TInput extends Currency, TOutput extends Currency>(
  planner: RoutePlanner,
  swap: Swap<TInput, TOutput>,
  tradeType: TradeType,
  options: SwapOptions
): void {
  const { route, inputAmount, outputAmount } = swap

  // single hop, so it can be reduced to plain v2 or v3 swap logic
  if (route.pools.length === 1) {
    if (route.pools[0] instanceof Pool) {
      return addV3Swap(planner, swap, tradeType, options)
    } else if (route.pools[0] instanceof Pair) {
      return addV2Swap(planner, swap, tradeType, options)
    } else {
      throw new Error('Invalid route type')
    }
  }

  const sections = partitionMixedRouteByProtocol(route)
}
