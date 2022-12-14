import { expect } from 'chai'
import JSBI from 'jsbi'
import { BigNumber, ethers, utils, Wallet } from 'ethers'
import { expandTo18Decimals, expandTo18DecimalsBN } from '../src/utils/expandTo18Decimals'
import { SwapRouter, ROUTER_AS_RECIPIENT } from '../src'
import { LooksRareData, LooksRareTrade, MakerOrder, TakerOrder } from '../src/entities/protocols/looksRare'
import { looksRareOrders } from './orders/looksRare'
import { ConsiderationItem, SeaportTrade } from '../src/entities/protocols/seaport'
import { seaportData2Covens, seaportValue } from './orders/seaport'
import { MixedRouteTrade, MixedRouteSDK, Trade as RouterTrade } from '@uniswap/router-sdk'
import { Trade as V2Trade, Pair, Route as RouteV2 } from '@uniswap/v2-sdk'
import { TokenType } from '../src/entities/NFTTrade'
import {
  Trade as V3Trade,
  Pool,
  Route as RouteV3,
  nearestUsableTick,
  TickMath,
  TICK_SPACINGS,
  FeeAmount,
} from '@uniswap/v3-sdk'
import { UniswapTrade } from '../src'
import { PermitSingle } from '@uniswap/permit2-sdk'
import { generatePermitSignature, toInputPermit } from './utils/permit2'
import { ROUTER_ADDRESS } from './utils/addresses'
import { CurrencyAmount, TradeType, Ether, Token, Percent, Currency } from '@uniswap/sdk-core'
import { registerFixture } from './forge/writeInterop'
import {
  buildTrade,
  makePermit,
  getUniswapPools,
  getPool,
  swapOptions,
  ETHER,
  RECIPIENT,
  WETH,
  DAI,
  USDC,
  FEE_AMOUNT,
} from './utils/uniswapData'

const FORGE_SENDER_ADDRESS = '0xcf03dd0a894ef79cb5b601a43c4b25e3ae4c67ed'
const SAMPLE_ADDR = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
// this is the address forge is deploying the router to
const ROUTER_ADDR = '0xe808c1cfeebb6cb36b537b82fa7c9eef31415a05'

describe('SwapRouter.swapCallParameters', () => {
  describe('erc20 --> nft', async () => {
    const looksRareOrder: MakerOrder = looksRareOrders[0]
    const makerOrder: MakerOrder = looksRareOrder
    const takerOrder: TakerOrder = {
      minPercentageToAsk: looksRareOrder.minPercentageToAsk,
      price: looksRareOrder.price,
      taker: ROUTER_ADDR,
      tokenId: looksRareOrder.tokenId,
      isOrderAsk: false,
      params: looksRareOrder.params,
    }
    const looksRareData: LooksRareData = {
      makerOrder: makerOrder,
      takerOrder: takerOrder,
      recipient: SAMPLE_ADDR,
      tokenType: TokenType.ERC721,
    }
    const seaportTrade = new SeaportTrade([seaportData2Covens])

    it('erc20 -> 1 looksrare nft', async () => {
      const { WETH_USDC_V3 } = await getUniswapPools(15360000)
      const outputEther = looksRareOrder.price.toString()
      const erc20Trade = buildTrade([
        await V3Trade.fromRoute(
          new RouteV3([WETH_USDC_V3], USDC, ETHER),
          CurrencyAmount.fromRawAmount(ETHER, outputEther),
          TradeType.EXACT_OUTPUT
        ),
      ])
      const opts = swapOptions({ recipient: ROUTER_AS_RECIPIENT })
      const uniswapTrade = new UniswapTrade(erc20Trade, opts)
      const looksRareTrade = new LooksRareTrade([looksRareData])

      const methodParameters = SwapRouter.swapCallParameters([uniswapTrade, looksRareTrade], {
        sender: FORGE_SENDER_ADDRESS,
      })
      registerFixture('_ERC20_FOR_1_LOOKSRARE_NFT', methodParameters)
      expect(methodParameters.value).to.eq('0')
    })

    it('erc20 + eth -> 1 looksrare nft', async () => {
      const { WETH_USDC_V3 } = await getUniswapPools(15360000)
      const looksRarePriceUSDC = CurrencyAmount.fromRawAmount(WETH, looksRareOrder.price.toString())
      const partialLooksRarePriceUSDC = (await WETH_USDC_V3.getOutputAmount(looksRarePriceUSDC))[0]
      const erc20Trade = buildTrade([
        await V3Trade.fromRoute(
          new RouteV3([WETH_USDC_V3], USDC, ETHER),
          partialLooksRarePriceUSDC, // do not send enough erc20 to cover entire cost
          TradeType.EXACT_INPUT
        ),
      ])
      const opts = swapOptions({ recipient: ROUTER_AS_RECIPIENT })
      const uniswapTrade = new UniswapTrade(erc20Trade, opts)
      const looksRareTrade = new LooksRareTrade([looksRareData])

      const methodParameters = SwapRouter.swapCallParameters([uniswapTrade, looksRareTrade], {
        sender: FORGE_SENDER_ADDRESS,
      })
      registerFixture('_ERC20_AND_ETH_FOR_1_LOOKSRARE_NFT', methodParameters)
      expect(methodParameters.value).to.not.eq('0')
    })

    it('erc20 -> 1 looksRare nft & 2 seaport nfts', async () => {
      const { WETH_USDC_V3 } = await getUniswapPools(15360000)
      const outputEther = BigNumber.from(looksRareOrder.price).add(seaportValue).toString()
      const erc20Trade = buildTrade([
        await V3Trade.fromRoute(
          new RouteV3([WETH_USDC_V3], USDC, ETHER),
          CurrencyAmount.fromRawAmount(ETHER, outputEther),
          TradeType.EXACT_OUTPUT
        ),
      ])
      const opts = swapOptions({ recipient: ROUTER_AS_RECIPIENT })
      const uniswapTrade = new UniswapTrade(erc20Trade, opts)
      const looksRareTrade = new LooksRareTrade([looksRareData])

      const methodParameters = SwapRouter.swapCallParameters([uniswapTrade, looksRareTrade, seaportTrade], {
        sender: FORGE_SENDER_ADDRESS,
      })
      registerFixture('_ERC20_FOR_1_LOOKSRARE_NFT_2_SEAPORT_NFTS', methodParameters)
      expect(methodParameters.value).to.eq('0')
    })

    it('erc20 + eth -> 1 looksRare nft & 2 seaport nfts', async () => {
      const { WETH_USDC_V3 } = await getUniswapPools(15360000)
      const outputEther = BigNumber.from(looksRareOrder.price).toString()
      const erc20Trade = buildTrade([
        await V3Trade.fromRoute(
          new RouteV3([WETH_USDC_V3], USDC, ETHER),
          CurrencyAmount.fromRawAmount(ETHER, outputEther),
          TradeType.EXACT_OUTPUT
        ),
      ])
      const opts = swapOptions({ recipient: ROUTER_AS_RECIPIENT })
      const uniswapTrade = new UniswapTrade(erc20Trade, opts)
      const looksRareTrade = new LooksRareTrade([looksRareData])

      const methodParameters = SwapRouter.swapCallParameters([uniswapTrade, looksRareTrade, seaportTrade], {
        sender: FORGE_SENDER_ADDRESS,
      })
      registerFixture('_ERC20_AND_ETH_FOR_1_LOOKSRARE_NFT_2_SEAPORT_NFTS', methodParameters)
      expect(methodParameters.value).to.eq('53000000000000000000')
    })
  })
})
