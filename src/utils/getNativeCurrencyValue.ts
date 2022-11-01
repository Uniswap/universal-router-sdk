import { ethers, BigNumber } from 'ethers'
import { Currency, CurrencyAmount } from '@uniswap/sdk-core'

export function getNativeCurrencyValue(currencyValues: CurrencyAmount<Currency>[]): BigNumber {
  for (const value of currencyValues) {
    if (value.currency.isNative) {
      const nativeCurrency = value.currency
      const zero = CurrencyAmount.fromRawAmount(nativeCurrency, 0)

      const currencyAmount = currencyValues.reduce(function (
        prevValue: CurrencyAmount<Currency>,
        currValue: CurrencyAmount<Currency>
      ) {
        const value = currValue.currency.isNative ? currValue : zero
        return prevValue.add(value)
      },
      zero)
      return BigNumber.from(currencyAmount.quotient.toString())
    }
  }

  return BigNumber.from(0)
}
