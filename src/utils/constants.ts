import { BigNumber } from 'ethers'

export const UNIVERSAL_ROUTER_ADDRESS = (chainId: number): string => {
  switch(chainId) {
    case 1:
      return '0x0000000052BE00bA3a005edbE83a0fB9aaDB964C'
    case 137:
      return '0xcedf31643c19f57b59608fae04202658310a895b'
    case 10:
      return '0x7166e00AbfaaB56Ca83b0025a9157FeBb01D31b3'
    case 42161:
      return '0xb36D7488EF109153679C1785aCcD1314549313E5'
    case 42220:
      return '0x2711385d4d6BfEd6B3EC06CeE352056a27A3B753'
    default:
      throw new Error(`Universal Router not deployed on chain ${chainId}`)
  }
}
export const PERMIT2_ADDRESS = '0x6fEe9BeC3B3fc8f9DA5740f0efc6BbE6966cd6A6'

export const CONTRACT_BALANCE = BigNumber.from(2).pow(255)
export const ETH_ADDRESS = '0x0000000000000000000000000000000000000000'

export const MSG_SENDER = '0x0000000000000000000000000000000000000001'
export const ADDRESS_THIS = '0x0000000000000000000000000000000000000002'
