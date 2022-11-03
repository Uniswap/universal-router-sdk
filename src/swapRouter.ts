import { abi } from '@uniswap/narwhal/artifacts/contracts/Router.sol/Router.json'
import { Interface } from '@ethersproject/abi'
import { BigNumber, BigNumberish } from 'ethers'
import { MethodParameters, Trade as V3Trade } from '@uniswap/v3-sdk'
import { Trade as V2Trade } from '@uniswap/v2-sdk'
import { Trade as RouterTrade, MixedRouteTrade, SwapOptions } from '@uniswap/router-sdk'
import { Currency, TradeType } from '@uniswap/sdk-core'
import { NFTTrade, SupportedProtocolsData } from './entities/NFTTrade'
import { RoutePlanner } from './utils/routerCommands'
import { UniswapTrade } from './entities/protocols/uniswap'

export type SwapRouterConfig = {
  deadline?: BigNumberish
}

export abstract class SwapRouter {
  public static INTERFACE: Interface = new Interface(abi)

  /**
   * Produces the on-chain method name to call and the hex encoded parameters to pass as arguments for a given swap.
   * @param trades to produce call parameters for
   */
  public static swapGenieCallParameters(
    trades: NFTTrade<SupportedProtocolsData>[],
    config: SwapRouterConfig = {}
  ): MethodParameters {
    let planner = new RoutePlanner()
    let nativeCurrencyValue: BigNumber = BigNumber.from(0)

    for (const trade of trades) {
      trade.encode(planner)
      nativeCurrencyValue = nativeCurrencyValue.add(trade.nativeCurrencyValue)
    }

    return SwapRouter.encodePlan(planner, nativeCurrencyValue, config)
  }

  /**
   * Produces the on-chain method name to call and the hex encoded parameters to pass as arguments for a given trade.
   * @param trades to produce call parameters for
   * @param options options for the call parameters
   */
  public static swapERC20CallParameters(
    trades:
      | RouterTrade<Currency, Currency, TradeType>
      | V2Trade<Currency, Currency, TradeType>
      | V3Trade<Currency, Currency, TradeType>
      | MixedRouteTrade<Currency, Currency, TradeType>
      | (
          | V2Trade<Currency, Currency, TradeType>
          | V3Trade<Currency, Currency, TradeType>
          | MixedRouteTrade<Currency, Currency, TradeType>
        )[],
    options: SwapOptions
  ): MethodParameters {
    const planner = new RoutePlanner()

    const trade: UniswapTrade =
      trades instanceof RouterTrade
        ? new UniswapTrade(trades)
        : Array.isArray(trades)
        ? UniswapTrade.from(trades)
        : UniswapTrade.from([trades])

    trade.encode(planner)
    return SwapRouter.encodePlan(planner, nativeCurrencyValue, config)
  }

  /**
   * Encodes a planned route into a method name and parameters for the Router contract.
   * @param planner the planned route
   * @param nativeCurrencyValue the native currency value of the planned route
   * @param config the router config
   */
  private static encodePlan(
    planner: RoutePlanner,
    nativeCurrencyValue: BigNumber,
    config: SwapRouterConfig = {}
  ): MethodParameters {
    const { commands, inputs } = planner

    let calldata: string
    if (config.deadline) {
      calldata = SwapRouter.INTERFACE.encodeFunctionData('execute(bytes,bytes[],uint256)', [
        commands,
        inputs,
        config.deadline,
      ])
    } else {
      calldata = SwapRouter.INTERFACE.encodeFunctionData('execute(bytes,bytes[])', [commands, inputs])
    }

    return { calldata, value: nativeCurrencyValue.toString() }
  }
}
