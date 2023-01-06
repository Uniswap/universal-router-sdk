import { expect } from 'chai'
import { BigNumber } from 'ethers'
import { ConvertWETH } from '../src/entities/protocols/convertWETH'
import { SwapRouter, PERMIT2_ADDRESS, ROUTER_AS_RECIPIENT, UNIVERSAL_ROUTER_ADDRESS, WETH_ADDRESS } from '../src'
import { utils, Wallet } from 'ethers'
import { LooksRareData, LooksRareTrade, MakerOrder, TakerOrder } from '../src/entities/protocols/looksRare'
import { looksRareOrders } from './orders/looksRare'
import { SeaportTrade } from '../src/entities/protocols/seaport'
import { seaportData2Covens, seaportValue } from './orders/seaport'
import { TokenType } from '../src/entities/NFTTrade'
import { Trade as V2Trade, Route as RouteV2, Pair } from '@uniswap/v2-sdk'
import { Trade as V3Trade, Route as RouteV3, Pool } from '@uniswap/v3-sdk'
import { generatePermitSignature, makePermit } from './utils/permit2'

import { UniswapTrade } from '../src'
import { CurrencyAmount, TradeType } from '@uniswap/sdk-core'
import { registerFixture } from './forge/writeInterop'
import { buildTrade, getUniswapPools, swapOptions, DAI, ETHER, WETH, USDC } from './utils/uniswapData'

const FORGE_SENDER_ADDRESS = '0xcf03dd0a894ef79cb5b601a43c4b25e3ae4c67ed'
const SAMPLE_ADDR = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
// this is the address forge is deploying the router to
const ROUTER_ADDR = '0xe808c1cfeebb6cb36b537b82fa7c9eef31415a05'

describe('SwapRouter.swapCallParameters', () => {
  const wallet = new Wallet(utils.zeroPad('0x1234', 32))

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
    const invalidLooksRareMaker = { ...makerOrder, tokenId: 1 }
    const invalidLooksRareData = { ...looksRareData, makerOrder: invalidLooksRareMaker }
    const seaportTrade = new SeaportTrade([seaportData2Covens])

    let WETH_USDC_V3: Pool
    let USDC_DAI_V2: Pair
    let WETH_USDC_V2: Pair

    beforeEach(async () => {
      ;({ WETH_USDC_V3, USDC_DAI_V2, WETH_USDC_V2 } = await getUniswapPools(15360000))
    })

    it('erc20 -> 1 looksrare nft', async () => {
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

    it('weth -> 1 looksrare nft', async () => {
      const laterLooksRareOrder: MakerOrder = looksRareOrders[3]
      const latermakerOrder: MakerOrder = laterLooksRareOrder
      const latertakerOrder: TakerOrder = {
        minPercentageToAsk: laterLooksRareOrder.minPercentageToAsk,
        price: laterLooksRareOrder.price,
        taker: UNIVERSAL_ROUTER_ADDRESS(1),
        tokenId: laterLooksRareOrder.tokenId,
        isOrderAsk: false,
        params: laterLooksRareOrder.params,
      }
      const laterLooksRareData: LooksRareData = {
        makerOrder: latermakerOrder,
        takerOrder: latertakerOrder,
        recipient: SAMPLE_ADDR,
        tokenType: TokenType.ERC721,
      }
      const laterlooksRareTrade = new LooksRareTrade([laterLooksRareData])

      const outputEther = laterLooksRareOrder.price.toString()
      const permit2Data = makePermit(WETH_ADDRESS(1), outputEther, '0', UNIVERSAL_ROUTER_ADDRESS(1))
      const signature = await generatePermitSignature(permit2Data, wallet, 1, PERMIT2_ADDRESS)
      const convertWETHData = {
        ...permit2Data,
        signature,
      }
      const convertWETHCommand = new ConvertWETH(outputEther, 1, convertWETHData)

      const methodParameters = SwapRouter.swapCallParameters([convertWETHCommand, laterlooksRareTrade], {
        sender: FORGE_SENDER_ADDRESS,
      })
      registerFixture('_WETH_FOR_1_LOOKSRARE_NFT', methodParameters)
      expect(methodParameters.value).to.eq('0')
    })

    it('erc20 + eth -> 1 looksrare nft', async () => {
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

    it('2 erc20s -> 1 NFT', async () => {
      const outputEther = BigNumber.from(looksRareOrder.price)
      const erc20Trade1 = buildTrade([
        await V3Trade.fromRoute(
          new RouteV3([WETH_USDC_V3], USDC, ETHER),
          CurrencyAmount.fromRawAmount(ETHER, outputEther.div(2).toString()),
          TradeType.EXACT_OUTPUT
        ),
      ])
      const erc20Trade2 = buildTrade([
        new V2Trade(
          new RouteV2([USDC_DAI_V2, WETH_USDC_V2], DAI, ETHER),
          CurrencyAmount.fromRawAmount(ETHER, outputEther.div(2).toString()),
          TradeType.EXACT_OUTPUT
        ),
      ])
      const opts = swapOptions({ recipient: ROUTER_AS_RECIPIENT })
      const uniswapTrade1 = new UniswapTrade(erc20Trade1, opts)
      const uniswapTrade2 = new UniswapTrade(erc20Trade2, opts)
      const looksRareTrade = new LooksRareTrade([looksRareData])

      const methodParameters = SwapRouter.swapCallParameters([uniswapTrade1, uniswapTrade2, looksRareTrade], {
        sender: FORGE_SENDER_ADDRESS,
      })
      registerFixture('_2_ERC20s_FOR_1_NFT', methodParameters)
      expect(methodParameters.value).to.eq('0')
    })

    it('erc20 -> 1 invalid NFT', async () => {
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
      const looksRareTrade = new LooksRareTrade([invalidLooksRareData])

      const methodParameters = SwapRouter.swapCallParameters([uniswapTrade, looksRareTrade], {
        sender: FORGE_SENDER_ADDRESS,
      })
      registerFixture('_ERC20_FOR_1_INVALID_NFT', methodParameters)
      expect(methodParameters.value).to.eq('0')
    })

    it('erc20 -> 3 NFTs partial fill', async () => {
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
      const looksRareTrade = new LooksRareTrade([invalidLooksRareData])

      const methodParameters = SwapRouter.swapCallParameters([uniswapTrade, looksRareTrade, seaportTrade], {
        sender: FORGE_SENDER_ADDRESS,
      })
      registerFixture('_ERC20_FOR_NFTS_PARTIAL_FILL', methodParameters)
      expect(methodParameters.value).to.eq('0')
    })
  })
})
