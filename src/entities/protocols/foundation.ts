import abi from '../../../abis/Foundation.json'
import { Interface } from '@ethersproject/abi'
import { NFTTrade, Market, TokenType, BuyItem } from '../NFTTrade'
import { RoutePlanner, CommandType } from '../../utils/routerCommands'
import { ethers, BigNumber, BigNumberish } from 'ethers'
import { CurrencyAmount, Ether } from '@uniswap/sdk-core'

export type FoundationData = {
  recipient: string
  tokenAddress: string
  tokenId: BigNumberish
  price: BigNumberish
  referrer: string // address
}

export class FoundationTrade extends NFTTrade<FoundationData> {
  public static INTERFACE: Interface = new Interface(abi)

  constructor(orders: FoundationData[]) {
    super(Market.Foundation, orders)
  }

  encode(planner: RoutePlanner): void {
    for (const item of this.orders) {
      const calldata = FoundationTrade.INTERFACE.encodeFunctionData('buyV2', [
        item.tokenAddress,
        item.tokenId,
        item.price,
        item.referrer,
      ])
      planner.addCommand(CommandType.FOUNDATION, [
        item.price,
        calldata,
        item.recipient,
        item.tokenAddress,
        item.tokenId,
      ])
    }
  }

  getBuyItems(): BuyItem[] {
    let buyItems: BuyItem[] = []
    for (const item of this.orders) {
      buyItems.push({
        tokenAddress: item.tokenAddress,
        tokenId: item.tokenId,
        priceInfo: CurrencyAmount.fromRawAmount(Ether.onChain(1), item.price),
        tokenType: TokenType.ERC721,
      })
    }
    return buyItems
  }

  getTotalPrice(): CurrencyAmount<Currency> {
    let total = BigNumber.from(0)
    for (const item of this.orders) {
      total.add(item.price)
    }
    return CurrencyAmount.fromRawAmount(Ether.onChain(1), total)
  }
}
