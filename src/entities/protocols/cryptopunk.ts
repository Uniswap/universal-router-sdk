import { TradeConfig } from '../Command'
import { NFTTrade, Market, TokenType, BuyItem } from '../NFTTrade'
import { RoutePlanner, CommandType } from '../../utils/routerCommands'
import { BigNumber, BigNumberish } from 'ethers'

export type CryptopunkData = {
  tokenId: BigNumberish
  recipient: string
  value: BigNumberish
}

export class CryptopunkTrade extends NFTTrade<CryptopunkData> {
  public static CRYPTOPUNK_ADDRESS: string = '0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb'

  constructor(orders: CryptopunkData[]) {
    super(Market.Cryptopunks, orders)
  }

  encode(planner: RoutePlanner, config: TradeConfig): void {
    for (const item of this.orders) {
      planner.addCommand(CommandType.CRYPTOPUNKS, [item.tokenId, item.recipient, item.value], config.allowRevert)
    }
  }

  getBuyItems(): BuyItem[] {
    let buyItems: BuyItem[] = []
    for (const item of this.orders) {
      buyItems.push({
        tokenAddress: CryptopunkTrade.CRYPTOPUNK_ADDRESS,
        tokenId: item.tokenId,
        tokenType: TokenType.Cryptopunk,
      })
    }
    return buyItems
  }

  getTotalPrice(): BigNumber {
    let total = BigNumber.from(0)
    for (const item of this.orders) {
      total = total.add(item.value)
    }
    return total
  }
}
