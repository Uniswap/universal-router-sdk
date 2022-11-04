import { expect } from 'chai'
import JSBI from 'jsbi'
import { BigNumber, utils } from 'ethers'
import { SwapRouter, UniswapTrade } from '../src'
import { SwapOptions } from '@uniswap/router-sdk'
import { Trade as V2Trade, Pair, Route as RouteV2 } from '@uniswap/v2-sdk'
import {
  Trade as V3Trade,
  Pool,
  Route as RouteV3,
  nearestUsableTick,
  TickMath,
  TICK_SPACINGS,
  FeeAmount,
  encodeSqrtRatioX96,
} from '@uniswap/v3-sdk'
import { CurrencyAmount, TradeType, Ether, Token, Percent } from '@uniswap/sdk-core'
import { registerFixture } from './forge/writeInterop'

const ETHER = Ether.onChain(1)
const RECIPIENT = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const WETH = new Token(1, '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', 18, 'WETH', 'Wrapped Ether')
const DAI = new Token(1, '0x6B175474E89094C44Da98b954EedeAC495271d0F', 18, 'DAI', 'dai')
const USDC = new Token(1, '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', 6, 'USDC', 'USD Coin')
const feeAmount = FeeAmount.MEDIUM

describe('Uniswap', () => {
  describe('v2', () => {
    const WETH_USDC = new Pair(
      CurrencyAmount.fromRawAmount(WETH, '30118865014718000095728'),
      CurrencyAmount.fromRawAmount(USDC, '48771876162527')
    )

    const USDC_DAI = new Pair(
      CurrencyAmount.fromRawAmount(USDC, '10000000000'),
      CurrencyAmount.fromRawAmount(DAI, '10000000000000000000000')
    )

    it('encodes a single exactInput ETH->USDC swap', async () => {
      const inputEther = utils.parseEther('1').toString()
      const trade = new V2Trade(
        new RouteV2([WETH_USDC], ETHER, USDC),
        CurrencyAmount.fromRawAmount(ETHER, inputEther),
        TradeType.EXACT_INPUT
      )
      const opts = swapOptions({})
      const methodParameters = SwapRouter.swapERC20CallParameters([trade], opts)
      registerFixture('_UNISWAP_V2_EXACT_INPUT_SINGLE_NATIVE', methodParameters)
      expect(methodParameters.value).to.eq(inputEther)
    })

    it('encodes a single exactInput ETH->USDC->DAI swap', async () => {
      const inputEther = utils.parseEther('1').toString()
      const trade = new V2Trade(
        new RouteV2([WETH_USDC, USDC_DAI], ETHER, DAI),
        CurrencyAmount.fromRawAmount(ETHER, inputEther),
        TradeType.EXACT_INPUT
      )
      const opts = swapOptions({})
      const methodParameters = SwapRouter.swapERC20CallParameters([trade], opts)
      registerFixture('_UNISWAP_V2_EXACT_INPUT_NATIVE', methodParameters)
      expect(methodParameters.value).to.eq(inputEther)
    })

    it('encodes a single exactInput USDC->ETH swap', async () => {
      const inputUSDC = utils.parseUnits('1000', 6).toString()
      const trade = new V2Trade(
        new RouteV2([WETH_USDC], USDC, ETHER),
        CurrencyAmount.fromRawAmount(USDC, inputUSDC),
        TradeType.EXACT_INPUT
      )
      const opts = swapOptions({})
      const methodParameters = SwapRouter.swapERC20CallParameters([trade], opts)
      registerFixture('_UNISWAP_V2_EXACT_INPUT_SINGLE_ERC20', methodParameters)
      expect(methodParameters.value).to.eq('0')
    })

    it('encodes a single exactInput DAI->USDC->ETH swap', async () => {
      const inputDAI = utils.parseEther('10').toString()
      const trade = new V2Trade(
        new RouteV2([USDC_DAI, WETH_USDC], DAI, ETHER),
        CurrencyAmount.fromRawAmount(DAI, inputDAI),
        TradeType.EXACT_INPUT
      )
      const opts = swapOptions({})
      const methodParameters = SwapRouter.swapERC20CallParameters([trade], opts)
      registerFixture('_UNISWAP_V2_EXACT_INPUT_ERC20', methodParameters)
      expect(methodParameters.value).to.eq('0')
    })

    it('encodes a single exactOutput ETH->USDC swap', async () => {
      const outputUSDC = utils.parseUnits('1000', 6).toString()
      const inputETH = BigNumber.from('619416665686539617').toString()
      const trade = new V2Trade(
        new RouteV2([WETH_USDC], ETHER, USDC),
        CurrencyAmount.fromRawAmount(USDC, outputUSDC),
        TradeType.EXACT_OUTPUT
      )
      const opts = swapOptions({})
      const methodParameters = SwapRouter.swapERC20CallParameters([trade], opts)
      registerFixture('_UNISWAP_V2_EXACT_OUTPUT_SINGLE_NATIVE', methodParameters)
      expect(methodParameters.value).to.eq(inputETH)
    })

    it('encodes a single exactOutput USDC->ETH swap', async () => {
      const outputETH = utils.parseEther('1').toString()
      const trade = new V2Trade(
        new RouteV2([WETH_USDC], USDC, ETHER),
        CurrencyAmount.fromRawAmount(ETHER, outputETH),
        TradeType.EXACT_OUTPUT
      )
      const opts = swapOptions({})
      const methodParameters = SwapRouter.swapERC20CallParameters([trade], opts)
      registerFixture('_UNISWAP_V2_EXACT_OUTPUT_SINGLE_ERC20', methodParameters)
      expect(methodParameters.value).to.eq('0')
    })
  })

  describe('v3', () => {
    const WETH_USDC = makePool(WETH, USDC, '1000000', encodeSqrtRatioX96(1, 1))

    it('encodes a single exactInput ETH->USDC swap', async () => {
      const inputEther = utils.parseEther('1').toString()
      const trade = await V3Trade.fromRoute(
        new RouteV3([WETH_USDC], ETHER, USDC),
        CurrencyAmount.fromRawAmount(ETHER, inputEther),
        TradeType.EXACT_INPUT
      )
      const opts = swapOptions({})
      const methodParameters = SwapRouter.swapERC20CallParameters([trade], opts)
      registerFixture('_UNISWAP_V3_EXACT_INPUT_SINGLE_NATIVE', methodParameters)
      expect(methodParameters.value).to.eq(inputEther)
    })
  })
})

// use some sane defaults
function swapOptions(options: Partial<SwapOptions>): SwapOptions {
  return Object.assign(options, {
    slippageTolerance: new Percent(5, 100),
    recipient: RECIPIENT,
  })
}

function makePool(token0: Token, token1: Token, liquidity: string, sqrtRatioX96: JSBI) {
  return new Pool(token0, token1, feeAmount, sqrtRatioX96, liquidity, TickMath.getTickAtSqrtRatio(sqrtRatioX96), [
    {
      index: nearestUsableTick(TickMath.MIN_TICK, TICK_SPACINGS[feeAmount]),
      liquidityNet: liquidity,
      liquidityGross: liquidity,
    },
    {
      index: nearestUsableTick(TickMath.MAX_TICK, TICK_SPACINGS[feeAmount]),
      liquidityNet: -liquidity,
      liquidityGross: liquidity,
    },
  ])
}