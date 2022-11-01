import FOUNDATION_ABI from '../../../abis/Foundation.json'
import { NFTTrade, BuyItem } from '../NFTTrade'
import { RoutePlanner, CommandType } from '../../utils/routerCommands'
import { ethers, BigNumber } from 'ethers'
import { Currency, CurrencyAmount } from '@uniswap/sdk-core'

const FOUNDATION_INTERFACE = new ethers.utils.Interface(FOUNDATION_ABI)

export type FoundationData = {
  referrer: string // address
}

export class FoundationTrade extends NFTTrade<FoundationData> {
  readonly recipient: string //address
  readonly buyItems: BuyItem<FoundationData>[]
  readonly nativeCurrencyValue: BigNumber

  constructor(recipient: string, buyItems: BuyItem<FoundationData>[]) {
    super(recipient, buyItems)
  }

  encode(planner: RoutePlanner): void {
    for (const item of this.buyItems) {
      const value = item.priceInfo.quotient.toString()
      const calldata = FOUNDATION_INTERFACE.encodeFunctionData('buyV2', [
        item.address,
        item.tokenId,
        value,
        item.data.referrer,
      ])
      planner.addCommand(CommandType.FOUNDATION, [value, calldata, this.recipient, item.address, item.tokenId])
    }
  }
}
