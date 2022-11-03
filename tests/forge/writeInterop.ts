import fs from 'fs'
import { ethers } from 'ethers'
import { CurrencyAmount, Ether } from '@uniswap/sdk-core'
import { SwapRouter } from '../../src'
import { NFTTrade, TokenTypes } from '../../src/entities/NFTTrade'
import { FoundationTrade, FoundationData } from '../../src/entities/protocols/foundation'

function main() {
  const interop = {
    _FOUNDATION_BUY_ITEM: SwapRouter.swapGenieCallParameters([generateFoundationTrade()]),
  }

  fs.writeFileSync('./tests/forge/interop.json', JSON.stringify(interop))
}

const ETHER = Ether.onChain(1)
const SAMPLE_ADDR = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'

function generateFoundationTrade(): NFTTrade<FoundationData> {
  const foundationData: FoundationData = {
    referrer: '0x459e213D8B5E79d706aB22b945e3aF983d51BC4C', // official foundation referrer
  }

  // buyItem from block 15725945
  const foundationBuyItem = {
    address: '0xEf96021Af16BD04918b0d87cE045d7984ad6c38c',
    tokenId: 32,
    priceInfo: CurrencyAmount.fromRawAmount(ETHER, ethers.utils.parseEther('0.01').toString()),
    tokenType: TokenTypes.ERC721,
    data: foundationData,
  }
  return new FoundationTrade(SAMPLE_ADDR, [foundationBuyItem])
}

main()
