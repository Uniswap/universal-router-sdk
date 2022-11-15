import { BigNumber } from 'ethers'
import JSBI from 'jsbi'
import bn from 'bignumber.js'

export function expandTo18DecimalsBN(n: number): BigNumber {
  // use bn intermediately to allow decimals in intermediate calculations
  return BigNumber.from(new bn(n).times(new bn(10).pow(18)).toFixed())
}

export function expandTo18Decimals(n: number): JSBI {
  return JSBI.BigInt(BigNumber.from(n).mul(BigNumber.from(10).pow(18)).toString())
}
