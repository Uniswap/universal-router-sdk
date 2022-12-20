import { expect } from 'chai'
import { BigNumber } from 'ethers'
import { SwapRouter, ROUTER_AS_RECIPIENT } from '../src'
import { LooksRareData, LooksRareTrade, MakerOrder, TakerOrder } from '../src/entities/protocols/looksRare'
import { looksRareOrders } from './orders/looksRare'
import { SeaportTrade } from '../src/entities/protocols/seaport'
import { seaportData2Covens, seaportValue } from './orders/seaport'
import { TokenType } from '../src/entities/NFTTrade'
import { Trade as V3Trade, Route as RouteV3 } from '@uniswap/v3-sdk'
import { UniswapTrade } from '../src'
import { CurrencyAmount, TradeType } from '@uniswap/sdk-core'
import { registerFixture } from './forge/writeInterop'
import { buildTrade, getUniswapPools, swapOptions, ETHER, WETH, USDC } from './utils/uniswapData'

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
