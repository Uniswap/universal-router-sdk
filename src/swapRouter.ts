import { abi } from '@uniswap/narwhal/artifacts/contracts/Router.sol/Router.json'
import { Interface } from '@ethersproject/abi'
import { BigNumber, BigNumberish } from 'ethers'
import { MethodParameters } from '@uniswap/v3-sdk'
import { CurrencyAmount, WETH9, Ether, Currency } from '@uniswap/sdk-core'
import { NFTTrade, Markets, SupportedProtocolsData } from './entities/NFTTrade'
import { RoutePlanner } from './utils/routerCommands'

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
