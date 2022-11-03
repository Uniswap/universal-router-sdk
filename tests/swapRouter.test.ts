import { expect } from 'chai'
import { expandTo18Decimals } from '../src/utils/expandTo18Decimals'
import { SwapRouter } from '../src/swapRouter'
import { TokenTypes, Markets } from '../src/entities/NFTTrade'
import { CurrencyAmount, Currency, Ether } from '@uniswap/sdk-core'
import { FoundationTrade, FoundationData } from '../src/entities/protocols/foundation'
import { SeaportTrade, SeaportData } from '../src/entities/protocols/seaport'
import { seaportDataCoven1, seaportDataCoven2 } from './shared/seaportOrders'
import { NFTXTrade, NFTXData } from '../src/entities/protocols/nftx'

const ETHER = Ether.onChain(1)
const SAMPLE_ADDR = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'

describe('SwapRouter', () => {
  describe('Foundation', () => {
    const foundationData: FoundationData = {
      referrer: '0x459e213D8B5E79d706aB22b945e3aF983d51BC4C', // official foundation referrer
    }

    // buyItem from block 15725945
    const foundationBuyItem = {
      address: '0xEf96021Af16BD04918b0d87cE045d7984ad6c38c',
      tokenId: 32,
      priceInfo: CurrencyAmount.fromRawAmount(ETHER, expandTo18Decimals(0.01)),
      tokenType: TokenTypes.ERC721,
      data: foundationData,
    }

    it('encodes a single foundation trade', async () => {
      const foundationTrade = new FoundationTrade(SAMPLE_ADDR, [foundationBuyItem])
      const methodParameters = SwapRouter.swapGenieCallParameters([foundationTrade])
      expect(methodParameters.value).to.eq(foundationBuyItem.priceInfo.quotient.toString())
      expect(methodParameters.calldata).to.eq(
        '0x24856bc30000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000010f00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000160000000000000000000000000000000000000000000000000002386f26fc1000000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa000000000000000000000000ef96021af16bd04918b0d87ce045d7984ad6c38c00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000084b01ef608000000000000000000000000ef96021af16bd04918b0d87ce045d7984ad6c38c0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000002386f26fc10000000000000000000000000000459e213d8b5e79d706ab22b945e3af983d51bc4c00000000000000000000000000000000000000000000000000000000'
      )
    })
  })

  describe('NFTX', () => {
    const nftxDataCovenVault: NFTXData = {
      vaultId: 333,
      vaultAddress: '0xd89b16331f39ab3878daf395052851d3ac8cf3cd',
    }

    // buyItems from block 15360000
    const nftxBuyItemCoven1 = {
      address: '0x5180db8f5c931aae63c74266b211f580155ecac8',
      tokenId: 584,
      priceInfo: CurrencyAmount.fromRawAmount(ETHER, expandTo18Decimals(0.5)),
      tokenType: TokenTypes.ERC721,
      data: nftxDataCovenVault,
    }
    const nftxBuyItemCoven2 = {
      address: '0x5180db8f5c931aae63c74266b211f580155ecac8',
      tokenId: 3033,
      priceInfo: CurrencyAmount.fromRawAmount(ETHER, expandTo18Decimals(0.5)),
      tokenType: TokenTypes.ERC721,
      data: nftxDataCovenVault,
    }

    it('encodes buying two NFTs from a single NFTX vault', async () => {
      const nftxTrade = new NFTXTrade(SAMPLE_ADDR, [nftxBuyItemCoven1, nftxBuyItemCoven2])
      const methodParameters = SwapRouter.swapGenieCallParameters([nftxTrade])
      expect(methodParameters.value).to.eq(expandTo18Decimals(1).toString())
      expect(methodParameters.calldata).to.eq(
        '0x24856bc30000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000010a000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000001e00000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000001647fc82484000000000000000000000000000000000000000000000000000000000000014d000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000100000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000002480000000000000000000000000000000000000000000000000000000000000bd90000000000000000000000000000000000000000000000000000000000000002000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000d89b16331f39ab3878daf395052851d3ac8cf3cd00000000000000000000000000000000000000000000000000000000'
      )
    })
  })

  describe('Seaport', () => {
    // buyItems from block 15360000
    const seaportBuyItemCoven1 = {
      address: '0x5180db8f5c931aae63c74266b211f580155ecac8',
      tokenId: 8271,
      priceInfo: CurrencyAmount.fromRawAmount(ETHER, expandTo18Decimals(0.5)),
      tokenType: TokenTypes.ERC721,
      data: seaportDataCoven1,
    }
    const seaportBuyItemCoven2 = {
      address: '0x5180db8f5c931aae63c74266b211f580155ecac8',
      tokenId: 6366,
      priceInfo: CurrencyAmount.fromRawAmount(ETHER, expandTo18Decimals(0.5)),
      tokenType: TokenTypes.ERC721,
      data: seaportDataCoven2,
    }

    it('encodes buying two NFTs from a single NFTX vault', async () => {
      const seaportTrade = new SeaportTrade(SAMPLE_ADDR, [seaportBuyItemCoven1, seaportBuyItemCoven2])
      const methodParameters = SwapRouter.swapGenieCallParameters([seaportTrade])
      expect(methodParameters.value).to.eq(expandTo18Decimals(1).toString())
      expect(methodParameters.calldata).to.eq(
        '0x24856bc300000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000106000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000011600000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000010e487201b4100000000000000000000000000000000000000000000000000000000000000e00000000000000000000000000000000000000000000000000000000000000d000000000000000000000000000000000000000000000000000000000000000d200000000000000000000000000000000000000000000000000000000000000e400000007b02230091a7ed01230072f7006a004d60a8d4e71d599b8104250f0000000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa000000000000000000000000000000000000000000000000000000000000006400000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000062000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000052000000000000000000000000000000000000000000000000000000000000005a00000000000000000000000000f1fcc9da5db6753c90fbeb46024c056516fbc17000000000000000000000000004c00500000ad104d7dbd00e3ae0a5c00560c000000000000000000000000000000000000000000000000000000000000000160000000000000000000000000000000000000000000000000000000000000022000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000062c8c8590000000000000000000000000000000000000000000000000000000063b6246900000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000b2ac118e60420000007b02230091a7ed01230072f7006a004d60a8d4e71d599b8104250f00000000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000020000000000000000000000005180db8f5c931aae63c74266b211f580155ecac8000000000000000000000000000000000000000000000000000000000000204f000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001a79e95c588cc8000000000000000000000000000000000000000000000000001a79e95c588cc80000000000000000000000000000f1fcc9da5db6753c90fbeb46024c056516fbc170000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000b72fd2103b280000000000000000000000000000000000000000000000000000b72fd2103b280000000000000000000000000008de9c5a032463c561423387a9648c5c7bcc5bc9000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000016e5fa420765000000000000000000000000000000000000000000000000000016e5fa4207650000000000000000000000000000ac9d54ca08740a608b6c474e5ca07d51ca8117fa000000000000000000000000000000000000000000000000000000000000004158073c305ffa6daf8b6279050d9837d88040350a004efe3028fd6cda8aef41cd0819bb209b6ef3b3d6df717180677a3916c15ea669f8251471d3d39ee6abdac31b000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000052000000000000000000000000000000000000000000000000000000000000005a00000000000000000000000004fdcd0496f4c2d3629c0741626de74d24a683e50000000000000000000000000004c00500000ad104d7dbd00e3ae0a5c00560c000000000000000000000000000000000000000000000000000000000000000160000000000000000000000000000000000000000000000000000000000000022000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000062fc66520000000000000000000000000000000000000000000000000000000063e9c262000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000068d8b5d6667820000007b02230091a7ed01230072f7006a004d60a8d4e71d599b8104250f00000000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000020000000000000000000000005180db8f5c931aae63c74266b211f580155ecac800000000000000000000000000000000000000000000000000000000000018de00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100bd33fb98ba000000000000000000000000000000000000000000000000000100bd33fb98ba00000000000000000000000000004fdcd0496f4c2d3629c0741626de74d24a683e5000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006f05b59d3b2000000000000000000000000000000000000000000000000000006f05b59d3b200000000000000000000000000008de9c5a032463c561423387a9648c5c7bcc5bc900000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000ac9d54ca08740a608b6c474e5ca07d51ca8117fa000000000000000000000000000000000000000000000000000000000000004181237739418cadbfd0875476c1d343550166e7099f0430ad581e98245e03db303480cbfda1e2c9aa6f3663d7f5ab86800b72ddeaaf81998179a651eef627e5f81b000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000001800000000000000000000000000000000000000000000000000000000000000220000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'
      )
    })
  })
})
