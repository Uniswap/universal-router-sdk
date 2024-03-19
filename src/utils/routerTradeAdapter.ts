import { MixedRouteSDK, Trade as RouterTrade } from '@uniswap/router-sdk'
import {
  Currency,
  CurrencyAmount,
  Ether,
  NativeCurrency as SdkNativeCurrency,
  Token,
  TradeType,
} from '@uniswap/sdk-core'
import { Pair, Route as V2Route } from '@uniswap/v2-sdk'
import { Pool, Route as V3Route, FeeAmount } from '@uniswap/v3-sdk'
import { BigNumber } from 'ethers'
import { ETH_ADDRESS, WETH_ADDRESS } from './constants'

export enum ChainId {
  MAINNET = 1,
  OPTIMISM = 10,
  POLYGON = 137,
  ARBITRUM = 42161,
  BNB = 56,
  BASE = 8453,
}

export const WRAPPED_NATIVE_CURRENCY = {
  [ChainId.MAINNET]: new Token(
    ChainId.MAINNET,
    '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    18,
    'WETH',
    'Wrapped Ether'
  ),
  [ChainId.POLYGON]: new Token(
    ChainId.POLYGON,
    '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    18,
    'WMATIC',
    'Wrapped MATIC'
  ),
  [ChainId.OPTIMISM]: new Token(
    ChainId.OPTIMISM,
    '0x4200000000000000000000000000000000000006',
    18,
    'WETH',
    'Wrapped Ether'
  ),
  [ChainId.ARBITRUM]: new Token(
    ChainId.ARBITRUM,
    '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    18,
    'WETH',
    'Wrapped Ether'
  ),
  [ChainId.BNB]: new Token(ChainId.BNB, '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', 18, 'WBNB', 'Wrapped BNB'),
  [ChainId.BASE]: new Token(ChainId.BASE, '0x4200000000000000000000000000000000000006', 18, 'WETH', 'Wrapped Ether'),
}

export type ClassicInput = {
  readonly token: string
  readonly amount: string
}

export type ClassicOutput = {
  readonly token: string
  readonly amount: string
  readonly recipient: string
}

export type TokenInRoute = {
  address: string
  chainId: number
  symbol: string
  decimals: string
  name?: string
  buyFeeBps?: string
  sellFeeBps?: string
}

export enum PoolType {
  V2Pool = 'v2-pool',
  V3Pool = 'v3-pool',
}

export type V2Reserve = {
  token: TokenInRoute
  quotient: string
}

export type V2PoolInRoute = {
  type: PoolType.V2Pool
  address?: string
  tokenIn: TokenInRoute
  tokenOut: TokenInRoute
  reserve0: V2Reserve
  reserve1: V2Reserve
  amountIn?: string
  amountOut?: string
}

export type V3PoolInRoute = {
  type: PoolType.V3Pool
  address?: string
  tokenIn: TokenInRoute
  tokenOut: TokenInRoute
  sqrtRatioX96: string
  liquidity: string
  tickCurrent: string
  fee: string
  amountIn?: string
  amountOut?: string
}

export type PartialClassicQuote = {
  chainId: number
  swapper: string
  input: ClassicInput
  output: ClassicOutput
  slippage: number
  tradeType: TradeType
  route: Array<(V3PoolInRoute | V2PoolInRoute)[]>
}

interface RouteResult {
  routev3: V3Route<Currency, Currency> | null
  routev2: V2Route<Currency, Currency> | null
  mixedRoute: MixedRouteSDK<Currency, Currency> | null
  inputAmount: CurrencyAmount<Currency>
  outputAmount: CurrencyAmount<Currency>
}

export const isNativeCurrency = (address: string, chainId: number) =>
  address.toLowerCase() === WETH_ADDRESS(chainId).toLowerCase() || address.toLowerCase() === ETH_ADDRESS.toLowerCase()

export class RouterTradeAdapter {
  static fromClassicQuote(quote: PartialClassicQuote) {
    const { route, input, output, chainId } = quote

    const tokenIn = route[0]?.[0]?.tokenIn
    const tokenOut = route[0]?.[route[0]?.length - 1]?.tokenOut
    if (!tokenIn || !tokenOut) throw new Error('Expected both tokenIn and tokenOut to be present')

    const parsedCurrencyIn = RouterTradeAdapter.toCurrency(isNativeCurrency(input.token, chainId), tokenIn)
    const parsedCurrencyOut = RouterTradeAdapter.toCurrency(isNativeCurrency(output.token, chainId), tokenOut)

    const typedRoutes: RouteResult[] = route.map((route) => {
      if (route.length === 0) {
        throw new Error('Expected route to have at least one pair or pool')
      }
      const rawAmountIn = route[0].amountIn
      const rawAmountOut = route[route.length - 1].amountOut

      if (!rawAmountIn || !rawAmountOut) {
        throw new Error('Expected both raw amountIn and raw amountOut to be present')
      }

      const inputAmount = CurrencyAmount.fromRawAmount(parsedCurrencyIn, rawAmountIn)
      const outputAmount = CurrencyAmount.fromRawAmount(parsedCurrencyOut, rawAmountOut)

      const isOnlyV2 = RouterTradeAdapter.isVersionedRoute<V2PoolInRoute>(PoolType.V2Pool, route)
      const isOnlyV3 = RouterTradeAdapter.isVersionedRoute<V3PoolInRoute>(PoolType.V3Pool, route)

      return {
        routev3: isOnlyV3
          ? new V3Route(route.map(RouterTradeAdapter.toPool), parsedCurrencyIn, parsedCurrencyOut)
          : null,
        routev2: isOnlyV2
          ? new V2Route(route.map(RouterTradeAdapter.toPair), parsedCurrencyIn, parsedCurrencyOut)
          : null,
        mixedRoute:
          !isOnlyV3 && !isOnlyV2
            ? new MixedRouteSDK(route.map(RouterTradeAdapter.toPoolOrPair), parsedCurrencyIn, parsedCurrencyOut)
            : null,
        inputAmount,
        outputAmount,
      }
    })

    return new RouterTrade({
      v2Routes: typedRoutes
        .filter((route) => route.routev2)
        .map((route) => ({
          routev2: route.routev2 as V2Route<Currency, Currency>,
          inputAmount: route.inputAmount,
          outputAmount: route.outputAmount,
        })),
      v3Routes: typedRoutes
        .filter((route) => route.routev3)
        .map((route) => ({
          routev3: route.routev3 as V3Route<Currency, Currency>,
          inputAmount: route.inputAmount,
          outputAmount: route.outputAmount,
        })),
      mixedRoutes: typedRoutes
        .filter((route) => route.mixedRoute)
        .map((route) => ({
          mixedRoute: route.mixedRoute as MixedRouteSDK<Currency, Currency>,
          inputAmount: route.inputAmount,
          outputAmount: route.outputAmount,
        })),
      tradeType: quote.tradeType,
    })
  }

  private static toCurrency(isNative: boolean, token: TokenInRoute): Currency {
    if (isNative) {
      return new NativeCurrency(token.chainId, parseInt(token.decimals))
    }
    return this.toToken(token)
  }

  private static toPoolOrPair = (pool: V3PoolInRoute | V2PoolInRoute): Pool | Pair => {
    return pool.type === PoolType.V3Pool ? RouterTradeAdapter.toPool(pool) : RouterTradeAdapter.toPair(pool)
  }

  private static toToken(token: TokenInRoute): Token {
    const { chainId, address, decimals, symbol, buyFeeBps, sellFeeBps } = token
    return new Token(
      chainId,
      address,
      parseInt(decimals.toString()),
      symbol,
      /* name */ undefined,
      false,
      buyFeeBps ? BigNumber.from(buyFeeBps) : undefined,
      sellFeeBps ? BigNumber.from(sellFeeBps) : undefined
    )
  }

  private static toPool({ fee, sqrtRatioX96, liquidity, tickCurrent, tokenIn, tokenOut }: V3PoolInRoute): Pool {
    return new Pool(
      RouterTradeAdapter.toToken(tokenIn),
      RouterTradeAdapter.toToken(tokenOut),
      parseInt(fee) as FeeAmount,
      sqrtRatioX96,
      liquidity,
      parseInt(tickCurrent)
    )
  }

  private static toPair = ({ reserve0, reserve1 }: V2PoolInRoute): Pair => {
    return new Pair(
      CurrencyAmount.fromRawAmount(RouterTradeAdapter.toToken(reserve0.token), reserve0.quotient),
      CurrencyAmount.fromRawAmount(RouterTradeAdapter.toToken(reserve1.token), reserve1.quotient)
    )
  }

  private static isVersionedRoute<T extends V2PoolInRoute | V3PoolInRoute>(
    type: PoolType,
    route: (V3PoolInRoute | V2PoolInRoute)[]
  ): route is T[] {
    return route.every((pool) => pool.type === type)
  }
}

export class NativeCurrency extends SdkNativeCurrency {
  constructor(chainId: number, decimals: number, symbol?: string, name?: string) {
    if (chainId === ChainId.MAINNET) {
      return Ether.onChain(chainId)
    }
    super(chainId, decimals, symbol, name)
  }

  equals(currency: Currency): boolean {
    return currency.isNative && currency.chainId === this.chainId
  }

  get wrapped(): Token {
    const wrapped = WRAPPED_NATIVE_CURRENCY[this.chainId as ChainId]
    if (!wrapped) {
      throw new Error('unsupported chain')
    }

    return wrapped
  }
}
