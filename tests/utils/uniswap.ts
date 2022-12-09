import { expect } from 'chai'
import JSBI from 'jsbi'
import { ethers, utils, Wallet } from 'ethers'
import { expandTo18Decimals } from '../../src/utils/expandTo18Decimals'
import { SwapRouter } from '../../src'
import { MixedRouteTrade, MixedRouteSDK, Trade as RouterTrade } from '@uniswap/router-sdk'
import { Trade as V2Trade, Pair, Route as RouteV2 } from '@uniswap/v2-sdk'
import {
  Trade as V3Trade,
  Pool,
  Route as RouteV3,
  nearestUsableTick,
  TickMath,
  TICK_SPACINGS,
  FeeAmount,
} from '@uniswap/v3-sdk'
import { SwapOptions } from '../../src'
import { PermitSingle } from '@uniswap/permit2-sdk'
import { generatePermitSignature, toInputPermit } from './permit2'
import { ROUTER_ADDRESS } from './addresses'
import { CurrencyAmount, TradeType, Ether, Token, Percent, Currency } from '@uniswap/sdk-core'

export const ETHER = Ether.onChain(1)
export const RECIPIENT = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
export const WETH = new Token(1, '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', 18, 'WETH', 'Wrapped Ether')
export const DAI = new Token(1, '0x6B175474E89094C44Da98b954EedeAC495271d0F', 18, 'DAI', 'dai')
export const USDC = new Token(1, '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', 6, 'USDC', 'USD Coin')
export const FEE_AMOUNT = FeeAmount.MEDIUM

export const WETH_USDC_V2 = new Pair(
  CurrencyAmount.fromRawAmount(WETH, '34515228806027297273368'),
  CurrencyAmount.fromRawAmount(USDC, '43711377859274')
)

export const USDC_DAI_V2 = new Pair(
  CurrencyAmount.fromRawAmount(USDC, '10000000000'),
  CurrencyAmount.fromRawAmount(DAI, '10000000000000000000000')
)

// live values from the fork block
export const WETH_USDC_V3 = makePool(
  WETH,
  USDC,
  JSBI.BigInt('12684214223795176862'),
  JSBI.BigInt('2230513416205233323282465616270816')
)

export const WETH_USDC_V3_LOW_FEE = makePool(
  WETH,
  USDC,
  JSBI.BigInt('12684214223795176862'),
  JSBI.BigInt('2230513416205233323282465616270816'),
  FeeAmount.LOW
)

export const USDC_DAI_V3 = makePool(
  USDC,
  DAI,
  JSBI.BigInt('2470149530094514024128212'),
  JSBI.BigInt('79228223163124596104824')
)

// alternative constructor to create from protocol-specific sdks
export function buildTrade(
  trades: (
    | V2Trade<Currency, Currency, TradeType>
    | V3Trade<Currency, Currency, TradeType>
    | MixedRouteTrade<Currency, Currency, TradeType>
  )[]
): RouterTrade<Currency, Currency, TradeType> {
  return new RouterTrade({
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
  })
}

// use some sane defaults
export function swapOptions(options: Partial<SwapOptions>): SwapOptions {
  return Object.assign(
    {
      slippageTolerance: new Percent(5, 100),
      recipient: RECIPIENT,
    },
    options
  )
}

export function makePermit(
  token: string,
  amount: string = ethers.constants.MaxUint256.toString(),
  nonce: string = '0'
): PermitSingle {
  return {
    details: {
      token,
      amount,
      expiration: Math.floor(new Date().getTime() / 1000 + 1000).toString(),
      nonce,
    },
    spender: ROUTER_ADDRESS,
    sigDeadline: Math.floor(new Date().getTime() / 1000 + 1000).toString(),
  }
}

export function makePool(token0: Token, token1: Token, liquidity: JSBI, sqrtRatioX96: JSBI, feeAmount?: number) {
  return new Pool(
    token0,
    token1,
    feeAmount ?? FEE_AMOUNT,
    sqrtRatioX96,
    liquidity,
    TickMath.getTickAtSqrtRatio(sqrtRatioX96),
    [
      {
        index: nearestUsableTick(TickMath.MIN_TICK, TICK_SPACINGS[FEE_AMOUNT]),
        liquidityNet: liquidity,
        liquidityGross: liquidity,
      },
      {
        index: nearestUsableTick(TickMath.MAX_TICK, TICK_SPACINGS[FEE_AMOUNT]),
        liquidityNet: JSBI.multiply(liquidity, JSBI.BigInt('-1')),
        liquidityGross: liquidity,
      },
    ]
  )
}
