import { expect } from 'chai'
import JSBI from 'jsbi'
import { ethers, utils, Wallet } from 'ethers'
import { expandTo18Decimals, expandTo18DecimalsBN } from '../src/utils/expandTo18Decimals'
import { SwapRouter, ADDRESS_THIS } from '../src'
import { FoundationTrade, FoundationData } from '../src/entities/protocols/foundation'
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
import { UniswapTrade } from '../src'
import { PermitSingle } from '@uniswap/permit2-sdk'
import { generatePermitSignature, toInputPermit } from './utils/permit2'
import { ROUTER_ADDRESS } from './utils/addresses'
import { CurrencyAmount, TradeType, Ether, Token, Percent, Currency } from '@uniswap/sdk-core'
import { registerFixture } from './forge/writeInterop'
import {
  buildTrade,
  makePermit,
  makePool,
  swapOptions,
  ETHER,
  RECIPIENT,
  WETH,
  DAI,
  USDC,
  FEE_AMOUNT,
  WETH_USDC_V2,
  USDC_DAI_V2,
  WETH_USDC_V3,
  USDC_DAI_V3,
  WETH_USDC_V3_LOW_FEE,
} from './utils/uniswap'

const FORGE_SENDER_ADDRESS = '0xcf03dd0a894ef79cb5b601a43c4b25e3ae4c67ed'
const SAMPLE_ADDR = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
// this is the address forge is deploying the router to
const ROUTER_ADDR = '0x4a873bdd49f7f9cc0a5458416a12973fab208f8d'

describe('SwapRouter.swapCallParameters', () => {
  describe('erc20 --> nft', async () => {
    const foundationData: FoundationData = {
      referrer: '0x459e213D8B5E79d706aB22b945e3aF983d51BC4C',
      tokenAddress: '0xEf96021Af16BD04918b0d87cE045d7984ad6c38c',
      tokenId: 32,
      price: expandTo18DecimalsBN(0.01),
      recipient: SAMPLE_ADDR,
    }

    it('erc20 -> 1 foundation nft', async () => {
      const outputEther = foundationData.price.toString()
      const erc20Trade = buildTrade([
        await V3Trade.fromRoute(
          new RouteV3([WETH_USDC_V3], USDC, ETHER),
          CurrencyAmount.fromRawAmount(ETHER, outputEther),
          TradeType.EXACT_OUTPUT
        ),
      ])
      const opts = swapOptions({ recipient: ADDRESS_THIS })
      const uniswapTrade = new UniswapTrade(erc20Trade, opts)
      const foundationTrade = new FoundationTrade([foundationData])

      const methodParameters = SwapRouter.swapCallParameters([uniswapTrade, foundationTrade], {
        sender: FORGE_SENDER_ADDRESS,
      })
      registerFixture('_ERC20_FOR_1_FOUNDATION_NFT', methodParameters)
      expect(methodParameters.value).to.eq('0')
    })

    it('encodes a single exactInput ETH->USDC swap', async () => {
      const inputEther = utils.parseEther('1').toString()
      const erc20Trade = buildTrade([
        new V2Trade(
          new RouteV2([WETH_USDC_V2], ETHER, USDC),
          CurrencyAmount.fromRawAmount(ETHER, inputEther),
          TradeType.EXACT_INPUT
        ),
      ])
      const opts = swapOptions({})
      const uniswapTrade = new UniswapTrade(erc20Trade, opts)
      const methodParameters = SwapRouter.swapCallParameters([uniswapTrade], { sender: FORGE_SENDER_ADDRESS })
      registerFixture('_UNISWAP_V2_1_ETH_FOR_USDC', methodParameters)
      expect(methodParameters.value).to.eq(inputEther)
    })

    it('encodes a single foundation trade', async () => {
      const foundationTrade = new FoundationTrade([foundationData])
      const methodParameters = SwapRouter.swapNFTCallParameters([foundationTrade], { sender: FORGE_SENDER_ADDRESS })
      registerFixture('_FOUNDATION_BUY_ITEM', methodParameters)
      expect(methodParameters.value).to.eq(foundationData.price.toString())
      expect(methodParameters.calldata).to.eq(
        '0x24856bc30000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000021c040000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000001c00000000000000000000000000000000000000000000000000000000000000160000000000000000000000000000000000000000000000000002386f26fc1000000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa000000000000000000000000ef96021af16bd04918b0d87ce045d7984ad6c38c00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000084b01ef608000000000000000000000000ef96021af16bd04918b0d87ce045d7984ad6c38c0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000002386f26fc10000000000000000000000000000459e213d8b5e79d706ab22b945e3af983d51bc4c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000cf03dd0a894ef79cb5b601a43c4b25e3ae4c67ed0000000000000000000000000000000000000000000000000000000000000000'
      )
    })
  })
})
