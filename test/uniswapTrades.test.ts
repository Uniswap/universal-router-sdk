import { expect } from 'chai'
import JSBI from 'jsbi'
import { BigNumber, utils, Wallet } from 'ethers'
import { expandTo18Decimals, expandTo18DecimalsBN } from '../src/utils/numbers'
import { SwapRouter, UniswapTrade, WrapSTETH, UnwrapSTETH, FlatFeeOptions } from '../src'
import { MixedRouteTrade, MixedRouteSDK } from '@uniswap/router-sdk'
import { Trade as V2Trade, Pair, Route as RouteV2 } from '@uniswap/v2-sdk'
import { Trade as V3Trade, Route as RouteV3, Pool, FeeOptions } from '@uniswap/v3-sdk'
import { generatePermitSignature, toInputPermit, makePermit, generateEip2098PermitSignature } from './utils/permit2'
import { CurrencyAmount, Percent, TradeType } from '@uniswap/sdk-core'
import { registerFixture } from './forge/writeInterop'
import {
  buildTrade,
  getUniswapPools,
  swapOptions,
  getWStethPerSteth,
  getStethPerWsteth,
  getUniswapStethPool,
  ETHER,
  DAI,
  USDC,
  WETH,
  STETH,
  WSTETH,
} from './utils/uniswapData'
import { hexToDecimalString } from './utils/hexToDecimalString'
import { ROUTER_AS_RECIPIENT, SENDER_AS_RECIPIENT, STETH_ADDRESS } from '../src/utils/constants'
import {
  FORGE_PERMIT2_ADDRESS,
  FORGE_ROUTER_ADDRESS,
  TEST_FEE_RECIPIENT_ADDRESS,
  TEST_RECIPIENT_ADDRESS,
} from './utils/addresses'

const FORK_BLOCK = 16075500

// note: these tests aren't testing much but registering calldata to interop file
// for use in forge fork tests
describe('Uniswap', () => {
  const wallet = new Wallet(utils.zeroPad('0x1234', 32))
  let WETH_USDC_V2: Pair
  let USDC_DAI_V2: Pair
  let WETH_USDC_V3: Pool
  let WETH_USDC_V3_LOW_FEE: Pool
  let USDC_DAI_V3: Pool

  before(async () => {
    ;({ WETH_USDC_V2, USDC_DAI_V2, WETH_USDC_V3, USDC_DAI_V3, WETH_USDC_V3_LOW_FEE } = await getUniswapPools(
      FORK_BLOCK
    ))
  })

  describe('v2', () => {
    it('encodes a single exactInput ETH->USDC swap', async () => {
      const inputEther = utils.parseEther('1').toString()
      const trade = new V2Trade(
        new RouteV2([WETH_USDC_V2], ETHER, USDC),
        CurrencyAmount.fromRawAmount(ETHER, inputEther),
        TradeType.EXACT_INPUT
      )
      const opts = swapOptions({})
      const methodParameters = SwapRouter.swapERC20CallParameters(buildTrade([trade]), opts)
      const methodParametersV2 = SwapRouter.swapCallParameters(new UniswapTrade(buildTrade([trade]), opts))
      registerFixture('_UNISWAP_V2_1_ETH_FOR_USDC', methodParametersV2)
      expect(hexToDecimalString(methodParameters.value)).to.eq(inputEther)
      expect(methodParameters.calldata).to.eq(methodParametersV2.calldata)
      expect(methodParameters.value).to.eq(methodParametersV2.value)
    })

    it('encodes a single exactInput ETH->USDC swap, with a fee', async () => {
      const inputEther = utils.parseEther('1').toString()
      const trade = new V2Trade(
        new RouteV2([WETH_USDC_V2], ETHER, USDC),
        CurrencyAmount.fromRawAmount(ETHER, inputEther),
        TradeType.EXACT_INPUT
      )
      const feeOptions: FeeOptions = { fee: new Percent(5, 100), recipient: TEST_FEE_RECIPIENT_ADDRESS }
      const opts = swapOptions({ fee: feeOptions })
      const methodParameters = SwapRouter.swapERC20CallParameters(buildTrade([trade]), opts)
      const methodParametersV2 = SwapRouter.swapCallParameters(new UniswapTrade(buildTrade([trade]), opts))
      registerFixture('_UNISWAP_V2_1_ETH_FOR_USDC_WITH_FEE', methodParametersV2)
      expect(hexToDecimalString(methodParameters.value)).to.eq(inputEther)
      expect(methodParameters.calldata).to.eq(methodParametersV2.calldata)
      expect(methodParameters.value).to.eq(methodParametersV2.value)
    })

    it('encodes an exactInput ETH->USDC->DAI swap', async () => {
      const inputEther = utils.parseEther('1').toString()
      const trade = new V2Trade(
        new RouteV2([WETH_USDC_V2, USDC_DAI_V2], ETHER, DAI),
        CurrencyAmount.fromRawAmount(ETHER, inputEther),
        TradeType.EXACT_INPUT
      )
      const opts = swapOptions({})
      const methodParameters = SwapRouter.swapERC20CallParameters(buildTrade([trade]), opts)
      const methodParametersV2 = SwapRouter.swapCallParameters(new UniswapTrade(buildTrade([trade]), opts))
      registerFixture('_UNISWAP_V2_1_ETH_FOR_USDC_2_HOP', methodParametersV2)
      expect(hexToDecimalString(methodParameters.value)).to.eq(inputEther)
      expect(methodParameters.calldata).to.eq(methodParametersV2.calldata)
      expect(methodParameters.value).to.eq(methodParametersV2.value)
    })

    it('encodes an exactInput ETH->USDC->DAI swap, with a fee', async () => {
      const inputEther = utils.parseEther('1').toString()
      const trade = new V2Trade(
        new RouteV2([WETH_USDC_V2, USDC_DAI_V2], ETHER, DAI),
        CurrencyAmount.fromRawAmount(ETHER, inputEther),
        TradeType.EXACT_INPUT
      )
      const feeOptions: FeeOptions = { fee: new Percent(5, 100), recipient: TEST_FEE_RECIPIENT_ADDRESS }
      const opts = swapOptions({ fee: feeOptions })
      const methodParameters = SwapRouter.swapERC20CallParameters(buildTrade([trade]), opts)
      const methodParametersV2 = SwapRouter.swapCallParameters(new UniswapTrade(buildTrade([trade]), opts))
      registerFixture('_UNISWAP_V2_1_ETH_FOR_USDC_2_HOP_WITH_FEE', methodParametersV2)
      expect(hexToDecimalString(methodParameters.value)).to.eq(inputEther)
      expect(methodParameters.calldata).to.eq(methodParametersV2.calldata)
      expect(methodParameters.value).to.eq(methodParametersV2.value)
    })

    it('encodes a single exactInput USDC->ETH swap', async () => {
      const inputUSDC = utils.parseUnits('1000', 6).toString()
      const trade = new V2Trade(
        new RouteV2([WETH_USDC_V2], USDC, ETHER),
        CurrencyAmount.fromRawAmount(USDC, inputUSDC),
        TradeType.EXACT_INPUT
      )
      const opts = swapOptions({})
      const methodParameters = SwapRouter.swapERC20CallParameters(buildTrade([trade]), opts)
      const methodParametersV2 = SwapRouter.swapCallParameters(new UniswapTrade(buildTrade([trade]), opts))
      registerFixture('_UNISWAP_V2_1000_USDC_FOR_ETH', methodParametersV2)
      expect(hexToDecimalString(methodParameters.value)).to.eq('0')
      expect(methodParameters.calldata).to.eq(methodParametersV2.calldata)
      expect(methodParameters.value).to.eq(methodParametersV2.value)
    })

    it('encodes a single exactInput USDC->ETH swap, with WETH fee', async () => {
      const inputUSDC = utils.parseUnits('1000', 6).toString()
      const trade = new V2Trade(
        new RouteV2([WETH_USDC_V2], USDC, ETHER),
        CurrencyAmount.fromRawAmount(USDC, inputUSDC),
        TradeType.EXACT_INPUT
      )
      const feeOptions: FeeOptions = { fee: new Percent(5, 100), recipient: TEST_FEE_RECIPIENT_ADDRESS }
      const opts = swapOptions({ fee: feeOptions })
      const methodParameters = SwapRouter.swapERC20CallParameters(buildTrade([trade]), opts)
      const methodParametersV2 = SwapRouter.swapCallParameters(new UniswapTrade(buildTrade([trade]), opts))
      registerFixture('_UNISWAP_V2_1000_USDC_FOR_ETH_WITH_WETH_FEE', methodParametersV2)
      expect(hexToDecimalString(methodParameters.value)).to.eq('0')
      expect(methodParameters.calldata).to.eq(methodParametersV2.calldata)
      expect(methodParameters.value).to.eq(methodParametersV2.value)
    })

    it('encodes a single exactInput USDC->ETH swap with permit', async () => {
      const inputUSDC = utils.parseUnits('1000', 6).toString()
      const trade = new V2Trade(
        new RouteV2([WETH_USDC_V2], USDC, ETHER),
        CurrencyAmount.fromRawAmount(USDC, inputUSDC),
        TradeType.EXACT_INPUT
      )
      const permit = makePermit(USDC.address, inputUSDC, undefined, FORGE_ROUTER_ADDRESS)
      const signature = await generatePermitSignature(permit, wallet, trade.route.chainId, FORGE_PERMIT2_ADDRESS)
      const opts = swapOptions({ inputTokenPermit: toInputPermit(signature, permit) })
      const methodParameters = SwapRouter.swapERC20CallParameters(buildTrade([trade]), opts)
      const methodParametersV2 = SwapRouter.swapCallParameters(new UniswapTrade(buildTrade([trade]), opts))
      registerFixture('_UNISWAP_V2_1000_USDC_FOR_ETH_PERMIT', methodParametersV2)
      expect(hexToDecimalString(methodParameters.value)).to.eq('0')
      expect(methodParameters.calldata).to.eq(methodParametersV2.calldata)
      expect(methodParameters.value).to.eq(methodParametersV2.value)
    })

    it('encodes a single exactInput USDC->ETH swap with EIP-2098 permit', async () => {
      const inputUSDC = utils.parseUnits('1000', 6).toString()
      const trade = new V2Trade(
        new RouteV2([WETH_USDC_V2], USDC, ETHER),
        CurrencyAmount.fromRawAmount(USDC, inputUSDC),
        TradeType.EXACT_INPUT
      )
      const permit = makePermit(USDC.address, inputUSDC, undefined, FORGE_ROUTER_ADDRESS)
      const signature = await generateEip2098PermitSignature(permit, wallet, trade.route.chainId)
      const opts = swapOptions({ inputTokenPermit: toInputPermit(signature, permit) })
      const methodParameters = SwapRouter.swapERC20CallParameters(buildTrade([trade]), opts)
      const methodParametersV2 = SwapRouter.swapCallParameters(new UniswapTrade(buildTrade([trade]), opts))
      registerFixture('_UNISWAP_V2_1000_USDC_FOR_ETH_2098_PERMIT', methodParametersV2)
      expect(hexToDecimalString(methodParameters.value)).to.eq('0')
      expect(methodParameters.calldata).to.eq(methodParametersV2.calldata)
      expect(methodParameters.value).to.eq(methodParametersV2.value)
    })

    it('encodes a single exactInput USDC->ETH swap with permit with v recovery id', async () => {
      const inputUSDC = utils.parseUnits('1000', 6).toString()
      const trade = new V2Trade(
        new RouteV2([WETH_USDC_V2], USDC, ETHER),
        CurrencyAmount.fromRawAmount(USDC, inputUSDC),
        TradeType.EXACT_INPUT
      )
      const permit = makePermit(USDC.address, inputUSDC, undefined, FORGE_ROUTER_ADDRESS)
      const originalSignature = await generatePermitSignature(
        permit,
        wallet,
        trade.route.chainId,
        FORGE_PERMIT2_ADDRESS
      )
      const { recoveryParam } = utils.splitSignature(originalSignature)
      // slice off current v
      let signature = originalSignature.substring(0, originalSignature.length - 2)
      // append recoveryParam as v
      signature += BigNumber.from(recoveryParam).toHexString().slice(2)
      // assert ethers sanitization technique works
      expect(utils.joinSignature(utils.splitSignature(signature))).to.eq(originalSignature)
      const opts = swapOptions({ inputTokenPermit: toInputPermit(signature, permit) })
      const methodParameters = SwapRouter.swapERC20CallParameters(buildTrade([trade]), opts)
      const methodParametersV2 = SwapRouter.swapCallParameters(new UniswapTrade(buildTrade([trade]), opts))
      registerFixture('_UNISWAP_V2_1000_USDC_FOR_ETH_PERMIT_V_RECOVERY_PARAM', methodParametersV2)
      expect(hexToDecimalString(methodParameters.value)).to.eq('0')
      expect(methodParameters.calldata).to.eq(methodParametersV2.calldata)
      expect(methodParameters.value).to.eq(methodParametersV2.value)
    })

    it('encodes an exactInput DAI->USDC->ETH swap', async () => {
      const inputDAI = utils.parseEther('10').toString()
      const trade = new V2Trade(
        new RouteV2([USDC_DAI_V2, WETH_USDC_V2], DAI, ETHER),
        CurrencyAmount.fromRawAmount(DAI, inputDAI),
        TradeType.EXACT_INPUT
      )
      const opts = swapOptions({})
      const methodParameters = SwapRouter.swapERC20CallParameters(buildTrade([trade]), opts)
      const methodParametersV2 = SwapRouter.swapCallParameters(new UniswapTrade(buildTrade([trade]), opts))
      registerFixture('_UNISWAP_V2_10_DAI_FOR_ETH_2_HOP', methodParametersV2)
      expect(hexToDecimalString(methodParameters.value)).to.eq('0')
      expect(methodParameters.calldata).to.eq(methodParametersV2.calldata)
      expect(methodParameters.value).to.eq(methodParametersV2.value)
    })

    it('encodes a single exactOutput ETH->USDC swap', async () => {
      const outputUSDC = utils.parseUnits('1000', 6).toString()
      const trade = new V2Trade(
        new RouteV2([WETH_USDC_V2], ETHER, USDC),
        CurrencyAmount.fromRawAmount(USDC, outputUSDC),
        TradeType.EXACT_OUTPUT
      )
      const opts = swapOptions({})
      const methodParameters = SwapRouter.swapERC20CallParameters(buildTrade([trade]), opts)
      const methodParametersV2 = SwapRouter.swapCallParameters(new UniswapTrade(buildTrade([trade]), opts))
      registerFixture('_UNISWAP_V2_ETH_FOR_1000_USDC', methodParametersV2)
      expect(hexToDecimalString(methodParameters.value)).to.not.equal('0')
      expect(methodParameters.calldata).to.eq(methodParametersV2.calldata)
      expect(methodParameters.value).to.eq(methodParametersV2.value)
    })

    it('encodes a single exactOutput ETH->USDC swap, with a fee', async () => {
      // We must adjust the output amount for the 5% output fee
      const outputUSDC = utils.parseUnits('1000', 6)
      const adjustedOutputUSDC = outputUSDC
        .mul(10000)
        .div(10000 - 500)
        .toString()
      const trade = new V2Trade(
        new RouteV2([WETH_USDC_V2], ETHER, USDC),
        CurrencyAmount.fromRawAmount(USDC, adjustedOutputUSDC),
        TradeType.EXACT_OUTPUT
      )
      const feeOptions: FeeOptions = { fee: new Percent(5, 100), recipient: TEST_FEE_RECIPIENT_ADDRESS }
      const opts = swapOptions({ fee: feeOptions })
      const methodParameters = SwapRouter.swapERC20CallParameters(buildTrade([trade]), opts)
      const methodParametersV2 = SwapRouter.swapCallParameters(new UniswapTrade(buildTrade([trade]), opts))
      registerFixture('_UNISWAP_V2_ETH_FOR_1000_USDC_WITH_FEE', methodParametersV2)
      expect(hexToDecimalString(methodParameters.value)).to.not.equal('0')
      expect(methodParameters.calldata).to.eq(methodParametersV2.calldata)
      expect(methodParameters.value).to.eq(methodParametersV2.value)
    })

    it('encodes a single exactOutput ETH->USDC swap, with a flat fee', async () => {
      const outputUSDC = utils.parseUnits('1050', 6).toString()
      const trade = new V2Trade(
        new RouteV2([WETH_USDC_V2], ETHER, USDC),
        CurrencyAmount.fromRawAmount(USDC, outputUSDC),
        TradeType.EXACT_OUTPUT
      )
      const feeOptions: FlatFeeOptions = { amount: utils.parseUnits('50', 6), recipient: TEST_FEE_RECIPIENT_ADDRESS }
      const opts = swapOptions({ flatFee: feeOptions })
      const methodParameters = SwapRouter.swapERC20CallParameters(buildTrade([trade]), opts)
      const methodParametersV2 = SwapRouter.swapCallParameters(new UniswapTrade(buildTrade([trade]), opts))
      registerFixture('_UNISWAP_V2_ETH_FOR_1000_USDC_WITH_FLAT_FEE', methodParametersV2)
      expect(hexToDecimalString(methodParameters.value)).to.not.equal('0')
      expect(methodParameters.calldata).to.eq(methodParametersV2.calldata)
      expect(methodParameters.value).to.eq(methodParametersV2.value)
    })

    it('encodes a single exactOutput USDC->ETH swap, with a flat fee', async () => {
      const outputUSDC = utils.parseUnits('15', 18).toString()
      const trade = new V2Trade(
        new RouteV2([WETH_USDC_V2], USDC, ETHER),
        CurrencyAmount.fromRawAmount(ETHER, outputUSDC),
        TradeType.EXACT_OUTPUT
      )
      const feeOptions: FlatFeeOptions = { amount: utils.parseUnits('5', 18), recipient: TEST_FEE_RECIPIENT_ADDRESS }
      const opts = swapOptions({ flatFee: feeOptions })
      const methodParameters = SwapRouter.swapERC20CallParameters(buildTrade([trade]), opts)
      const methodParametersV2 = SwapRouter.swapCallParameters(new UniswapTrade(buildTrade([trade]), opts))
      registerFixture('_UNISWAP_V2_USCD_FOR_10_ETH_WITH_FLAT_FEE', methodParametersV2)
      expect(hexToDecimalString(methodParameters.value)).to.equal('0')
      expect(methodParameters.calldata).to.eq(methodParametersV2.calldata)
      expect(methodParameters.value).to.eq(methodParametersV2.value)
    })

    it('encodes a single exactOutput USDC->ETH swap', async () => {
      const outputETH = utils.parseEther('1').toString()
      const trade = new V2Trade(
        new RouteV2([WETH_USDC_V2], USDC, ETHER),
        CurrencyAmount.fromRawAmount(ETHER, outputETH),
        TradeType.EXACT_OUTPUT
      )
      const opts = swapOptions({})
      const methodParameters = SwapRouter.swapERC20CallParameters(buildTrade([trade]), opts)
      const methodParametersV2 = SwapRouter.swapCallParameters(new UniswapTrade(buildTrade([trade]), opts))
      registerFixture('_UNISWAP_V2_USDC_FOR_1_ETH', methodParametersV2)
      expect(hexToDecimalString(methodParameters.value)).to.eq('0')
      expect(methodParameters.calldata).to.eq(methodParametersV2.calldata)
      expect(methodParameters.value).to.eq(methodParametersV2.value)
    })
  })

  describe('v3', () => {
    it('encodes a single exactInput ETH->USDC swap', async () => {
      const inputEther = utils.parseEther('1').toString()
      const trade = await V3Trade.fromRoute(
        new RouteV3([WETH_USDC_V3], ETHER, USDC),
        CurrencyAmount.fromRawAmount(ETHER, inputEther),
        TradeType.EXACT_INPUT
      )
      const opts = swapOptions({})
      const methodParameters = SwapRouter.swapERC20CallParameters(buildTrade([trade]), opts)
      const methodParametersV2 = SwapRouter.swapCallParameters(new UniswapTrade(buildTrade([trade]), opts))
      registerFixture('_UNISWAP_V3_1_ETH_FOR_USDC', methodParametersV2)
      expect(hexToDecimalString(methodParameters.value)).to.eq(inputEther)
      expect(methodParameters.calldata).to.eq(methodParametersV2.calldata)
      expect(methodParameters.value).to.eq(methodParametersV2.value)
    })

    it('encodes a single exactInput ETH->USDC swap, with a fee', async () => {
      const inputEther = utils.parseEther('1').toString()
      const trade = await V3Trade.fromRoute(
        new RouteV3([WETH_USDC_V3], ETHER, USDC),
        CurrencyAmount.fromRawAmount(ETHER, inputEther),
        TradeType.EXACT_INPUT
      )
      const feeOptions: FeeOptions = { fee: new Percent(5, 100), recipient: TEST_FEE_RECIPIENT_ADDRESS }
      const opts = swapOptions({ fee: feeOptions })
      const methodParameters = SwapRouter.swapERC20CallParameters(buildTrade([trade]), opts)
      const methodParametersV2 = SwapRouter.swapCallParameters(new UniswapTrade(buildTrade([trade]), opts))
      registerFixture('_UNISWAP_V3_1_ETH_FOR_USDC_WITH_FEE', methodParametersV2)
      expect(hexToDecimalString(methodParameters.value)).to.eq(inputEther)
      expect(methodParameters.calldata).to.eq(methodParametersV2.calldata)
      expect(methodParameters.value).to.eq(methodParametersV2.value)
    })

    it('encodes a single exactInput ETH->USDC swap, with a flat fee', async () => {
      const inputEther = utils.parseEther('1').toString()
      const trade = await V3Trade.fromRoute(
        new RouteV3([WETH_USDC_V3], ETHER, USDC),
        CurrencyAmount.fromRawAmount(ETHER, inputEther),
        TradeType.EXACT_INPUT
      )
      const feeOptions: FlatFeeOptions = { amount: utils.parseUnits('50', 6), recipient: TEST_FEE_RECIPIENT_ADDRESS }
      const opts = swapOptions({ flatFee: feeOptions })
      const methodParameters = SwapRouter.swapERC20CallParameters(buildTrade([trade]), opts)
      const methodParametersV2 = SwapRouter.swapCallParameters(new UniswapTrade(buildTrade([trade]), opts))
      registerFixture('_UNISWAP_V3_1_ETH_FOR_USDC_WITH_FLAT_FEE', methodParametersV2)
      expect(hexToDecimalString(methodParameters.value)).to.eq(inputEther)
      expect(methodParameters.calldata).to.eq(methodParametersV2.calldata)
      expect(methodParameters.value).to.eq(methodParametersV2.value)
    })

    it('encodes a single exactInput USDC->ETH swap', async () => {
      const inputUSDC = utils.parseUnits('1000', 6).toString()
      const trade = await V3Trade.fromRoute(
        new RouteV3([WETH_USDC_V3], USDC, ETHER),
        CurrencyAmount.fromRawAmount(USDC, inputUSDC),
        TradeType.EXACT_INPUT
      )
      const opts = swapOptions({})
      const methodParameters = SwapRouter.swapERC20CallParameters(buildTrade([trade]), opts)
      const methodParametersV2 = SwapRouter.swapCallParameters(new UniswapTrade(buildTrade([trade]), opts))
      registerFixture('_UNISWAP_V3_1000_USDC_FOR_ETH', methodParametersV2)
      expect(hexToDecimalString(methodParameters.value)).to.eq('0')
      expect(methodParameters.calldata).to.eq(methodParametersV2.calldata)
      expect(methodParameters.value).to.eq(methodParametersV2.value)
    })

    it('encodes a single exactInput USDC->ETH swap, with WETH fee', async () => {
      const inputUSDC = utils.parseUnits('1000', 6).toString()
      const trade = await V3Trade.fromRoute(
        new RouteV3([WETH_USDC_V3], USDC, ETHER),
        CurrencyAmount.fromRawAmount(USDC, inputUSDC),
        TradeType.EXACT_INPUT
      )
      const feeOptions: FeeOptions = { fee: new Percent(5, 100), recipient: TEST_FEE_RECIPIENT_ADDRESS }
      const opts = swapOptions({ fee: feeOptions })
      const methodParameters = SwapRouter.swapERC20CallParameters(buildTrade([trade]), opts)
      const methodParametersV2 = SwapRouter.swapCallParameters(new UniswapTrade(buildTrade([trade]), opts))
      registerFixture('_UNISWAP_V3_1000_USDC_FOR_ETH_WITH_WETH_FEE', methodParametersV2)
      expect(hexToDecimalString(methodParameters.value)).to.eq('0')
      expect(methodParameters.calldata).to.eq(methodParametersV2.calldata)
      expect(methodParameters.value).to.eq(methodParametersV2.value)
    })

    it('encodes a single exactInput USDC->ETH swap with permit', async () => {
      const inputUSDC = utils.parseUnits('1000', 6).toString()
      const trade = await V3Trade.fromRoute(
        new RouteV3([WETH_USDC_V3], USDC, ETHER),
        CurrencyAmount.fromRawAmount(USDC, inputUSDC),
        TradeType.EXACT_INPUT
      )
      const permit = makePermit(USDC.address, inputUSDC, undefined, FORGE_ROUTER_ADDRESS)
      const signature = await generatePermitSignature(
        permit,
        wallet,
        trade.swaps[0].route.chainId,
        FORGE_PERMIT2_ADDRESS
      )
      const opts = swapOptions({ inputTokenPermit: toInputPermit(signature, permit) })
      const methodParameters = SwapRouter.swapERC20CallParameters(buildTrade([trade]), opts)
      const methodParametersV2 = SwapRouter.swapCallParameters(new UniswapTrade(buildTrade([trade]), opts))
      registerFixture('_UNISWAP_V3_1000_USDC_FOR_ETH_PERMIT', methodParametersV2)
      expect(hexToDecimalString(methodParameters.value)).to.eq('0')
      expect(methodParameters.calldata).to.eq(methodParametersV2.calldata)
      expect(methodParameters.value).to.eq(methodParametersV2.value)
    })

    it('encodes a single exactInput ETH->USDC->DAI swap', async () => {
      const inputEther = utils.parseEther('1').toString()
      const trade = await V3Trade.fromRoute(
        new RouteV3([WETH_USDC_V3, USDC_DAI_V3], ETHER, DAI),
        CurrencyAmount.fromRawAmount(ETHER, inputEther),
        TradeType.EXACT_INPUT
      )
      const opts = swapOptions({})
      const methodParameters = SwapRouter.swapERC20CallParameters(buildTrade([trade]), opts)
      const methodParametersV2 = SwapRouter.swapCallParameters(new UniswapTrade(buildTrade([trade]), opts))
      registerFixture('_UNISWAP_V3_1_ETH_FOR_DAI_2_HOP', methodParametersV2)
      expect(hexToDecimalString(methodParameters.value)).to.eq(inputEther)
      expect(methodParameters.calldata).to.eq(methodParametersV2.calldata)
      expect(methodParameters.value).to.eq(methodParametersV2.value)
    })

    it('encodes a single exactOutput ETH->USDC swap', async () => {
      const outputUSDC = utils.parseUnits('1000', 6).toString()
      const trade = await V3Trade.fromRoute(
        new RouteV3([WETH_USDC_V3], ETHER, USDC),
        CurrencyAmount.fromRawAmount(USDC, outputUSDC),
        TradeType.EXACT_OUTPUT
      )
      const opts = swapOptions({})
      const methodParameters = SwapRouter.swapERC20CallParameters(buildTrade([trade]), opts)
      const methodParametersV2 = SwapRouter.swapCallParameters(new UniswapTrade(buildTrade([trade]), opts))
      registerFixture('_UNISWAP_V3_ETH_FOR_1000_USDC', methodParametersV2)
      expect(hexToDecimalString(methodParameters.value)).to.not.equal('0')
      expect(methodParameters.calldata).to.eq(methodParametersV2.calldata)
      expect(methodParameters.value).to.eq(methodParametersV2.value)
    })

    it('encodes a single exactOutput USDC->ETH swap', async () => {
      const outputEther = utils.parseEther('1').toString()
      const trade = await V3Trade.fromRoute(
        new RouteV3([WETH_USDC_V3], USDC, ETHER),
        CurrencyAmount.fromRawAmount(ETHER, outputEther),
        TradeType.EXACT_OUTPUT
      )
      const opts = swapOptions({})
      const methodParameters = SwapRouter.swapERC20CallParameters(buildTrade([trade]), opts)
      const methodParametersV2 = SwapRouter.swapCallParameters(new UniswapTrade(buildTrade([trade]), opts))
      registerFixture('_UNISWAP_V3_USDC_FOR_1_ETH', methodParametersV2)
      expect(hexToDecimalString(methodParameters.value)).to.eq('0')
      expect(methodParameters.calldata).to.eq(methodParametersV2.calldata)
      expect(methodParameters.value).to.eq(methodParametersV2.value)
    })

    it('encodes an exactOutput ETH->USDC->DAI swap', async () => {
      const outputDai = utils.parseEther('1000').toString()
      const trade = await V3Trade.fromRoute(
        new RouteV3([WETH_USDC_V3, USDC_DAI_V3], ETHER, DAI),
        CurrencyAmount.fromRawAmount(DAI, outputDai),
        TradeType.EXACT_OUTPUT
      )
      const opts = swapOptions({})
      const methodParameters = SwapRouter.swapERC20CallParameters(buildTrade([trade]), opts)
      const methodParametersV2 = SwapRouter.swapCallParameters(new UniswapTrade(buildTrade([trade]), opts))
      registerFixture('_UNISWAP_V3_ETH_FOR_1000_DAI_2_HOP', methodParametersV2)
      expect(hexToDecimalString(methodParameters.value)).to.not.equal('0')
      expect(methodParameters.calldata).to.eq(methodParametersV2.calldata)
      expect(methodParameters.value).to.eq(methodParametersV2.value)
    })

    it('encodes an exactOutput DAI->USDC->ETH swap', async () => {
      const outputEther = utils.parseEther('1').toString()
      const trade = await V3Trade.fromRoute(
        new RouteV3([USDC_DAI_V3, WETH_USDC_V3], DAI, ETHER),
        CurrencyAmount.fromRawAmount(ETHER, outputEther),
        TradeType.EXACT_OUTPUT
      )
      const opts = swapOptions({})
      const methodParameters = SwapRouter.swapERC20CallParameters(buildTrade([trade]), opts)
      const methodParametersV2 = SwapRouter.swapCallParameters(new UniswapTrade(buildTrade([trade]), opts))
      registerFixture('_UNISWAP_V3_DAI_FOR_1_ETH_2_HOP', methodParametersV2)
      expect(hexToDecimalString(methodParameters.value)).to.equal('0')
      expect(methodParameters.calldata).to.eq(methodParametersV2.calldata)
      expect(methodParameters.value).to.eq(methodParametersV2.value)
    })

    it('encodes an exactOutput DAI->USDC->ETH swap, with WETH fee', async () => {
      // "exact output" of 1ETH. We must adjust for a 5% fee
      const outputEther = utils.parseEther('1')
      const adjustedOutputEther = outputEther
        .mul(10000)
        .div(10000 - 500)
        .toString()
      const trade = await V3Trade.fromRoute(
        new RouteV3([USDC_DAI_V3, WETH_USDC_V3], DAI, ETHER),
        CurrencyAmount.fromRawAmount(ETHER, adjustedOutputEther),
        TradeType.EXACT_OUTPUT
      )
      const feeOptions: FeeOptions = { fee: new Percent(5, 100), recipient: TEST_FEE_RECIPIENT_ADDRESS }
      const opts = swapOptions({ fee: feeOptions })
      const methodParameters = SwapRouter.swapERC20CallParameters(buildTrade([trade]), opts)
      const methodParametersV2 = SwapRouter.swapCallParameters(new UniswapTrade(buildTrade([trade]), opts))
      registerFixture('_UNISWAP_V3_DAI_FOR_1_ETH_2_HOP_WITH_WETH_FEE', methodParametersV2)
      expect(hexToDecimalString(methodParameters.value)).to.equal('0')
      expect(methodParameters.calldata).to.eq(methodParametersV2.calldata)
      expect(methodParameters.value).to.eq(methodParametersV2.value)
    })
  })

  describe('mixed (interleaved)', async () => {
    it('encodes a mixed exactInput v3ETH->v2USDC->DAI swap', async () => {
      const inputEther = utils.parseEther('1').toString()
      const trade = await MixedRouteTrade.fromRoute(
        new MixedRouteSDK([WETH_USDC_V3, USDC_DAI_V2], ETHER, DAI),
        CurrencyAmount.fromRawAmount(ETHER, inputEther),
        TradeType.EXACT_INPUT
      )
      const opts = swapOptions({})
      const methodParameters = SwapRouter.swapERC20CallParameters(buildTrade([trade]), opts)
      const methodParametersV2 = SwapRouter.swapCallParameters(new UniswapTrade(buildTrade([trade]), opts))
      registerFixture('_UNISWAP_MIXED_1_ETH_FOR_DAI', methodParametersV2)
      expect(hexToDecimalString(methodParameters.value)).to.eq(inputEther)
      expect(methodParameters.calldata).to.eq(methodParametersV2.calldata)
      expect(methodParameters.value).to.eq(methodParametersV2.value)
    })

    it('encodes a mixed exactInput v2ETH->v3USDC->DAI swap', async () => {
      const inputEther = utils.parseEther('1').toString()
      const trade = await MixedRouteTrade.fromRoute(
        new MixedRouteSDK([WETH_USDC_V2, USDC_DAI_V3], ETHER, DAI),
        CurrencyAmount.fromRawAmount(ETHER, inputEther),
        TradeType.EXACT_INPUT
      )
      const opts = swapOptions({})
      const methodParameters = SwapRouter.swapERC20CallParameters(buildTrade([trade]), opts)
      const methodParametersV2 = SwapRouter.swapCallParameters(new UniswapTrade(buildTrade([trade]), opts))
      registerFixture('_UNISWAP_MIXED_1_ETH_FOR_DAI_V2_FIRST', methodParametersV2)
      expect(hexToDecimalString(methodParameters.value)).to.eq(inputEther)
      expect(methodParameters.calldata).to.eq(methodParametersV2.calldata)
      expect(methodParameters.value).to.eq(methodParametersV2.value)
    })

    it('encodes a mixed exactInput v2ETH->v2USDC->DAI swap', async () => {
      const inputEther = utils.parseEther('1').toString()
      const trade = await MixedRouteTrade.fromRoute(
        new MixedRouteSDK([WETH_USDC_V2, USDC_DAI_V2], ETHER, DAI),
        CurrencyAmount.fromRawAmount(ETHER, inputEther),
        TradeType.EXACT_INPUT
      )
      const opts = swapOptions({})
      const methodParameters = SwapRouter.swapERC20CallParameters(buildTrade([trade]), opts)
      const methodParametersV2 = SwapRouter.swapCallParameters(new UniswapTrade(buildTrade([trade]), opts))
      registerFixture('_UNISWAP_MIXED_1_ETH_FOR_DAI_V2_ONLY', methodParametersV2)
      expect(hexToDecimalString(methodParameters.value)).to.eq(inputEther)
      expect(methodParameters.calldata).to.eq(methodParametersV2.calldata)
      expect(methodParameters.value).to.eq(methodParametersV2.value)
    })

    it('encodes a mixed exactInput v3ETH->v3USDC->DAI swap', async () => {
      const inputEther = utils.parseEther('1').toString()
      const trade = await MixedRouteTrade.fromRoute(
        new MixedRouteSDK([WETH_USDC_V3, USDC_DAI_V3], ETHER, DAI),
        CurrencyAmount.fromRawAmount(ETHER, inputEther),
        TradeType.EXACT_INPUT
      )
      const opts = swapOptions({})
      const methodParameters = SwapRouter.swapERC20CallParameters(buildTrade([trade]), opts)
      const methodParametersV2 = SwapRouter.swapCallParameters(new UniswapTrade(buildTrade([trade]), opts))
      registerFixture('_UNISWAP_MIXED_1_ETH_FOR_DAI_V3_ONLY', methodParametersV2)
      expect(hexToDecimalString(methodParameters.value)).to.eq(inputEther)
      expect(methodParameters.calldata).to.eq(methodParametersV2.calldata)
      expect(methodParameters.value).to.eq(methodParametersV2.value)
    })

    it('encodes a mixed exactInput v2DAI->v3USDC->ETH swap', async () => {
      const inputDai = utils.parseEther('1000').toString()
      const trade = await MixedRouteTrade.fromRoute(
        new MixedRouteSDK([USDC_DAI_V2, WETH_USDC_V3], DAI, ETHER),
        CurrencyAmount.fromRawAmount(DAI, inputDai),
        TradeType.EXACT_INPUT
      )
      const opts = swapOptions({})
      const methodParameters = SwapRouter.swapERC20CallParameters(buildTrade([trade]), opts)
      const methodParametersV2 = SwapRouter.swapCallParameters(new UniswapTrade(buildTrade([trade]), opts))
      registerFixture('_UNISWAP_MIXED_DAI_FOR_ETH', methodParametersV2)
      expect(hexToDecimalString(methodParameters.value)).to.eq('0')
      expect(methodParameters.calldata).to.eq(methodParametersV2.calldata)
      expect(methodParameters.value).to.eq(methodParametersV2.value)
    })
  })

  describe('multi-route', async () => {
    it('encodes a split exactInput with 2 routes v3ETH->v3USDC & v2ETH->v2USDC swap', async () => {
      const inputEther = expandTo18Decimals(1)
      const v2Trade = new V2Trade(
        new RouteV2([WETH_USDC_V2], ETHER, USDC),
        CurrencyAmount.fromRawAmount(ETHER, inputEther),
        TradeType.EXACT_INPUT
      )
      const v3Trade = await V3Trade.fromRoute(
        new RouteV3([WETH_USDC_V3], ETHER, USDC),
        CurrencyAmount.fromRawAmount(ETHER, inputEther),
        TradeType.EXACT_INPUT
      )
      const opts = swapOptions({})
      const methodParameters = SwapRouter.swapERC20CallParameters(buildTrade([v2Trade, v3Trade]), opts)
      const methodParametersV2 = SwapRouter.swapCallParameters(new UniswapTrade(buildTrade([v2Trade, v3Trade]), opts))
      registerFixture('_UNISWAP_SPLIT_TWO_ROUTES_ETH_TO_USDC', methodParametersV2)
      expect(hexToDecimalString(methodParameters.value)).to.eq(JSBI.multiply(inputEther, JSBI.BigInt(2)).toString())
      expect(methodParameters.calldata).to.eq(methodParametersV2.calldata)
      expect(methodParameters.value).to.eq(methodParametersV2.value)
    })

    it('encodes a split exactInput with 3 routes v3ETH->v3USDC & v2ETH->v2USDC swap', async () => {
      const inputEther = expandTo18Decimals(1)
      const v2Trade = new V2Trade(
        new RouteV2([WETH_USDC_V2], ETHER, USDC),
        CurrencyAmount.fromRawAmount(ETHER, inputEther),
        TradeType.EXACT_INPUT
      )
      const v3Trade1 = await V3Trade.fromRoute(
        new RouteV3([WETH_USDC_V3], ETHER, USDC),
        CurrencyAmount.fromRawAmount(ETHER, inputEther),
        TradeType.EXACT_INPUT
      )
      const v3Trade2 = await V3Trade.fromRoute(
        new RouteV3([WETH_USDC_V3_LOW_FEE], ETHER, USDC),
        CurrencyAmount.fromRawAmount(ETHER, inputEther),
        TradeType.EXACT_INPUT
      )

      const opts = swapOptions({})
      const methodParameters = SwapRouter.swapERC20CallParameters(buildTrade([v2Trade, v3Trade1, v3Trade2]), opts)
      const methodParametersV2 = SwapRouter.swapCallParameters([
        new UniswapTrade(buildTrade([v2Trade, v3Trade1, v3Trade2]), opts),
      ])
      registerFixture('_UNISWAP_SPLIT_TWO_ROUTES_ETH_TO_USDC', methodParametersV2)
      registerFixture('_UNISWAP_SPLIT_THREE_ROUTES_ETH_TO_USDC', methodParametersV2)
      expect(hexToDecimalString(methodParameters.value)).to.eq(JSBI.multiply(inputEther, JSBI.BigInt(3)).toString())
      expect(methodParameters.calldata).to.eq(methodParametersV2.calldata)
      expect(methodParameters.value).to.eq(methodParametersV2.value)
    })
  })

  describe('steth trades', async () => {
    let WETH_WSTETH_V3: Pool
    let wethPerSteth: BigNumber

    before(async () => {
      WETH_WSTETH_V3 = await getUniswapStethPool()
    })

    it('encodes a single exactInput STETH -> WSTETH -> WETH swap with Permit', async () => {
      const inputSTETH = expandTo18DecimalsBN('0.001')
      const inputWSTETH = await getWStethPerSteth(inputSTETH.sub(1))
      const permit2Data = makePermit(STETH_ADDRESS(1), inputSTETH.toString(), undefined, FORGE_ROUTER_ADDRESS)
      const signature = await generatePermitSignature(permit2Data, wallet, 1, FORGE_PERMIT2_ADDRESS)

      const WrapSTETHPermitData = {
        ...permit2Data,
        signature,
      }

      const wrapSTETH = new WrapSTETH(inputSTETH, 1, WrapSTETHPermitData)

      const trade = await V3Trade.fromRoute(
        new RouteV3([WETH_WSTETH_V3], WSTETH, WETH),
        CurrencyAmount.fromRawAmount(WSTETH, inputWSTETH),
        TradeType.EXACT_INPUT
      )

      const methodParameters = SwapRouter.swapCallParameters([
        wrapSTETH,
        new UniswapTrade(buildTrade([trade]), swapOptions({ payerIsRouter: true })),
      ])
      registerFixture('_UNISWAP_V3_001_STETH_FOR_WETH', methodParameters)
      expect(hexToDecimalString(methodParameters.value)).to.eq('0')
      // other assertions carried out in forge
    })

    it('encodes a single exactInput STETH -> WSTETH -> ETH swap with Permit', async () => {
      const inputSTETH = expandTo18DecimalsBN('0.001')
      const inputWSTETH = await getWStethPerSteth(inputSTETH.sub(1))
      const permit2Data = makePermit(STETH_ADDRESS(1), inputSTETH.toString(), undefined, FORGE_ROUTER_ADDRESS)
      const signature = await generatePermitSignature(permit2Data, wallet, 1, FORGE_PERMIT2_ADDRESS)

      const WrapSTETHPermitData = {
        ...permit2Data,
        signature,
      }

      const wrapSTETH = new WrapSTETH(inputSTETH, 1, WrapSTETHPermitData)

      const trade = await V3Trade.fromRoute(
        new RouteV3([WETH_WSTETH_V3], WSTETH, ETHER),
        CurrencyAmount.fromRawAmount(WSTETH, inputWSTETH),
        TradeType.EXACT_INPUT
      )

      const methodParameters = SwapRouter.swapCallParameters([
        wrapSTETH,
        new UniswapTrade(buildTrade([trade]), swapOptions({ payerIsRouter: true })),
      ])
      registerFixture('_UNISWAP_V3_001_STETH_FOR_ETH', methodParameters)
      expect(hexToDecimalString(methodParameters.value)).to.eq('0')
      // other assertions carried out in forge
    })

    it('encodes a single exactOutput STETH -> WSTETH -> WETH swap', async () => {
      const outputWETH = expandTo18DecimalsBN('0.001')

      // Trade Configurations
      const swapOpts = swapOptions({ payerIsRouter: true })
      const trade = await V3Trade.fromRoute(
        new RouteV3([WETH_WSTETH_V3], WSTETH, WETH),
        CurrencyAmount.fromRawAmount(WETH, outputWETH),
        TradeType.EXACT_OUTPUT
      )

      // Wrap Configurations
      const maximumWstethIn = BigNumber.from(trade.maximumAmountIn(swapOpts.slippageTolerance).quotient.toString())
      const inputSTETH = await getStethPerWsteth(maximumWstethIn.add('1'))
      const permit2Data = makePermit(STETH_ADDRESS(1), inputSTETH.toString(), undefined, FORGE_ROUTER_ADDRESS)
      const signature = await generatePermitSignature(permit2Data, wallet, 1, FORGE_PERMIT2_ADDRESS)
      const WrapSTETHPermitData = {
        ...permit2Data,
        signature,
      }
      const wrapSTETH = new WrapSTETH(inputSTETH, 1, WrapSTETHPermitData)
      const unwrapSTETH = new UnwrapSTETH(SENDER_AS_RECIPIENT, 0, 1)

      const methodParameters = SwapRouter.swapCallParameters([
        wrapSTETH,
        new UniswapTrade(buildTrade([trade]), swapOpts),
        unwrapSTETH,
      ])
      registerFixture('_UNISWAP_V3_001_STETH_FOR_WETH_EXACT_OUT', methodParameters)
      expect(hexToDecimalString(methodParameters.value)).to.eq('0')
      // other assertions carried out in forge
    })

    it('encodes a single exactInput WETH -> WSTETH -> STETH swap', async () => {
      const inputWETH = expandTo18DecimalsBN('0.001')

      const trade = await V3Trade.fromRoute(
        new RouteV3([WETH_WSTETH_V3], WETH, WSTETH),
        CurrencyAmount.fromRawAmount(WETH, inputWETH),
        TradeType.EXACT_INPUT
      )

      const uniswapTrade = new UniswapTrade(buildTrade([trade]), swapOptions({ recipient: ROUTER_AS_RECIPIENT }))
      const unwrapSTETH = new UnwrapSTETH(TEST_RECIPIENT_ADDRESS, 1, 1)

      const methodParameters = SwapRouter.swapCallParameters([uniswapTrade, unwrapSTETH])
      registerFixture('_UNISWAP_V3_001_WETH_FOR_STETH', methodParameters)
      expect(hexToDecimalString(methodParameters.value)).to.eq('0')
      // other assertions carried out in forge
    })

    it('encodes a single exactInput ETH -> WSTETH -> STETH swap with Permit', async () => {
      const inputETH = expandTo18DecimalsBN('0.001')

      const trade = await V3Trade.fromRoute(
        new RouteV3([WETH_WSTETH_V3], ETHER, WSTETH),
        CurrencyAmount.fromRawAmount(ETHER, inputETH),
        TradeType.EXACT_INPUT
      )

      const uniswapTrade = new UniswapTrade(buildTrade([trade]), swapOptions({ recipient: ROUTER_AS_RECIPIENT }))
      const unwrapSTETH = new UnwrapSTETH(TEST_RECIPIENT_ADDRESS, 1, 1)

      const methodParameters = SwapRouter.swapCallParameters([uniswapTrade, unwrapSTETH])
      registerFixture('_UNISWAP_V3_001_ETH_FOR_STETH', methodParameters)
      expect(hexToDecimalString(methodParameters.value)).to.eq(inputETH.toString())
      // other assertions carried out in forge
    })

    it('encodes a single exactOutput WETH -> WSTETH -> STETH swap', async () => {
      const outputSTETH = expandTo18DecimalsBN('0.001')
      const outputWSTETH = await getWStethPerSteth(outputSTETH.add('2'))

      const trade = await V3Trade.fromRoute(
        new RouteV3([WETH_WSTETH_V3], WETH, WSTETH),
        CurrencyAmount.fromRawAmount(WSTETH, outputWSTETH),
        TradeType.EXACT_OUTPUT
      )

      const uniswapTrade = new UniswapTrade(buildTrade([trade]), swapOptions({ recipient: ROUTER_AS_RECIPIENT }))
      const unwrapSTETH = new UnwrapSTETH(TEST_RECIPIENT_ADDRESS, 1, 1)

      const methodParameters = SwapRouter.swapCallParameters([uniswapTrade, unwrapSTETH])
      registerFixture('_UNISWAP_V3_001_WETH_FOR_STETH_EXACT_OUTPUT', methodParameters)
      expect(hexToDecimalString(methodParameters.value)).to.eq('0')
      // other assertions carried out in forge
    })
  })

  describe('fees', () => {
    it('throws if instantiated with a proportional fee and a flat fee', async () => {
      const outputUSDC = utils.parseUnits('1050', 6).toString()
      const trade = new V2Trade(
        new RouteV2([WETH_USDC_V2], ETHER, USDC),
        CurrencyAmount.fromRawAmount(USDC, outputUSDC),
        TradeType.EXACT_OUTPUT
      )
      const proportionalFee: FeeOptions = { fee: new Percent(5, 100), recipient: TEST_FEE_RECIPIENT_ADDRESS }
      const feeOptions: FlatFeeOptions = { amount: utils.parseUnits('50', 6), recipient: TEST_FEE_RECIPIENT_ADDRESS }
      const opts = swapOptions({ fee: proportionalFee, flatFee: feeOptions })
      expect(function () {
        SwapRouter.swapCallParameters(new UniswapTrade(buildTrade([trade]), opts))
      }).to.throw('Only one fee option permitted')
    })

    it('throws if flat fee amount is larger than minimumAmountOut', async () => {
      const inputEther = utils.parseEther('1').toString()
      const trade = await V3Trade.fromRoute(
        new RouteV3([WETH_USDC_V3], ETHER, USDC),
        CurrencyAmount.fromRawAmount(ETHER, inputEther),
        TradeType.EXACT_INPUT
      )
      const feeOptions: FlatFeeOptions = { amount: utils.parseUnits('5000', 6), recipient: TEST_FEE_RECIPIENT_ADDRESS }
      const opts = swapOptions({ flatFee: feeOptions })
      expect(function () {
        SwapRouter.swapCallParameters(new UniswapTrade(buildTrade([trade]), opts))
      }).to.throw('Flat fee amount greater than minimumAmountOut')
    })
  })
})
