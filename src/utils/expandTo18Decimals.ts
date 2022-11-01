import JSBI from 'jsbi'
import { BigintIsh } from '@uniswap/sdk-core'
import bn from 'bignumber.js'

export function expandTo18Decimals(n: number): BigintIsh {
  // use bn intermediately to allow decimals in intermediate calculations
  return JSBI.BigInt(new bn(n).times(new bn(10).pow(18)).toFixed())
}
