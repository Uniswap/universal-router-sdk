import invariant from 'tiny-invariant'
import { abi } from '@uniswap/universal-router/artifacts/contracts/UniversalRouter.sol/UniversalRouter.json'
import { Interface } from '@ethersproject/abi'
import { BigNumber, BigNumberish } from 'ethers'
import { MethodParameters } from '@uniswap/v3-sdk'
import { Trade as RouterTrade } from '@uniswap/router-sdk'
import { Currency, TradeType, Token } from '@uniswap/sdk-core'
import { NFTTrade, SupportedProtocolsData } from './entities/NFTTrade'
import { UniswapTrade, SwapOptions } from './entities/protocols/uniswap'
import { CommandType, RoutePlanner } from './utils/routerCommands'
import { encodePermit } from './utils/permit2'
import { ADDRESS_THIS, MSG_SENDER, ETH_ADDRESS } from './utils/constants'

export type SwapRouterConfig = {
  sender?: string // address
  deadline?: BigNumberish
}

type SupportedNFTTrade = NFTTrade<SupportedProtocolsData>

export abstract class SwapRouter {
  public static INTERFACE: Interface = new Interface(abi)

  public static swapCallParameters(
    trades: (SupportedNFTTrade | UniswapTrade)[],
    config: SwapRouterConfig = {}
  ): MethodParameters {
    const nftTrades = trades.filter((trade, index, []) => trade instanceof NFTTrade) as SupportedNFTTrade[]
    const allowRevert = nftTrades.length == 1 && nftTrades[0].orders.length == 1 ? false : true
    const planner = new RoutePlanner()

    // track value flow to require the right amount of native value
    let currentNativeValueInRouter = BigNumber.from(0)
    let transactionValue = BigNumber.from(0)

    for (const trade of trades) {
      if (trade instanceof NFTTrade) {
        // TODO: allow revert only for multiple nfts
        trade.encode(planner, { allowRevert })
        const tradePrice = trade.getTotalPrice()

        // send enough native value to contract for NFT purchase
        if (currentNativeValueInRouter.lt(tradePrice)) {
          transactionValue = transactionValue.add(tradePrice.sub(currentNativeValueInRouter))
          currentNativeValueInRouter = BigNumber.from(0)
        } else {
          currentNativeValueInRouter = currentNativeValueInRouter.sub(tradePrice)
        }
      } else if (trade instanceof UniswapTrade) {
        const inputIsNative = trade.trade.inputAmount.currency.isNative
        const outputIsNative = trade.trade.outputAmount.currency.isNative
        const swapOptions = trade.options

        invariant(!(inputIsNative && !!swapOptions.inputTokenPermit), 'NATIVE_INPUT_PERMIT')

        if (!!swapOptions.inputTokenPermit) {
          encodePermit(planner, swapOptions.inputTokenPermit)
        }

        if (inputIsNative) {
          transactionValue = transactionValue.add(
            BigNumber.from(trade.trade.maximumAmountIn(swapOptions.slippageTolerance).quotient.toString())
          )
        }

        // track amount of native currency in the router
        if (outputIsNative && swapOptions.recipient == ADDRESS_THIS) {
          currentNativeValueInRouter = currentNativeValueInRouter.add(
            BigNumber.from(trade.trade.minimumAmountOut(swapOptions.slippageTolerance).quotient.toString())
          )
        }

        trade.encode(planner, { allowRevert: false })
      }
    }
    // TODO: matches current logic for now, but should eventually only sweep for multiple NFT trades
    if (nftTrades.length > 0) planner.addCommand(CommandType.SWEEP, [ETH_ADDRESS, MSG_SENDER, 0])
    return SwapRouter.encodePlan(planner, transactionValue, config)
  }

  /** TODO: Deprecate in favor of swapCallParameters
   * Produces the on-chain method name to call and the hex encoded parameters to pass as arguments for a given swap.
   * @param trades to produce call parameters for
   */
  public static swapNFTCallParameters(
    trades: NFTTrade<SupportedProtocolsData>[],
    config: SwapRouterConfig = {}
  ): MethodParameters {
    invariant(!!config.sender, 'SENDER_REQUIRED')
    let planner = new RoutePlanner()
    let totalPrice = BigNumber.from(0)

    const allowRevert = trades.length == 1 && trades[0].orders.length == 1 ? false : true

    for (const trade of trades) {
      trade.encode(planner, { allowRevert })
      totalPrice = totalPrice.add(trade.getTotalPrice())
    }

    planner.addCommand(CommandType.SWEEP, [ETH_ADDRESS, MSG_SENDER, 0])
    return SwapRouter.encodePlan(planner, totalPrice, config)
  }

  /** TODO: Deprecate in favor of swapCallParameters
   * Produces the on-chain method name to call and the hex encoded parameters to pass as arguments for a given trade.
   * @param trades to produce call parameters for
   * @param options options for the call parameters
   */
  public static swapERC20CallParameters(
    trades: RouterTrade<Currency, Currency, TradeType>,
    swapOptions: SwapOptions,
    routerConfig: SwapRouterConfig = {}
  ): MethodParameters {
    // TODO: use permit if signature included in swapOptions
    const planner = new RoutePlanner()

    const trade: UniswapTrade = new UniswapTrade(trades, swapOptions)

    const inputCurrency = trade.trade.inputAmount.currency
    invariant(!(inputCurrency.isNative && !!swapOptions.inputTokenPermit), 'NATIVE_INPUT_PERMIT')

    if (swapOptions.inputTokenPermit) {
      encodePermit(planner, swapOptions.inputTokenPermit)
    }

    const nativeCurrencyValue = inputCurrency.isNative
      ? BigNumber.from(trade.trade.maximumAmountIn(swapOptions.slippageTolerance).quotient.toString())
      : BigNumber.from(0)

    trade.encode(planner, { allowRevert: false })
    return SwapRouter.encodePlan(planner, nativeCurrencyValue, routerConfig)
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
    const functionSignature = !!config.deadline ? 'execute(bytes,bytes[],uint256)' : 'execute(bytes,bytes[])'
    const parameters = !!config.deadline ? [commands, inputs, config.deadline] : [commands, inputs]
    const calldata = SwapRouter.INTERFACE.encodeFunctionData(functionSignature, parameters)
    return { calldata, value: nativeCurrencyValue.toHexString() }
  }
}
