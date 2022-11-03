import abi from '../../../abis/LooksRare.json'
import { Interface } from '@ethersproject/abi'
import { NFTTrade, Market, BuyItem, TokenType } from '../NFTTrade'
import { RoutePlanner, CommandType } from '../../utils/routerCommands'
import { ethers, BigNumber, BigNumberish } from 'ethers'
import { Currency, CurrencyAmount } from '@uniswap/sdk-core'

export type MakerOrder = {
  collection: string
  tokenId: BigNumber
  isOrderAsk: true
  signer: string
  strategy: string
  currency: string
  amount: BigNumber
  price: BigNumber
  minPercentageToAsk: BigNumber
  nonce: BigNumber
  startTime: BigNumber
  endTime: BigNumber
  v: BigNumber
  r: string
  s: string
  params: string
}

export type TakerOrder = {
  minPercentageToAsk: BigNumber
  price: BigNumber
  taker: string
  tokenId: BigNumber
  isOrderAsk: boolean
  params: string
}

export type LooksRareData = {
  makerOrder: MakerOrder
  takerOrder: TakerOrder
  recipient: string
}

export class LooksRareTrade extends NFTTrade<LooksRareData> {
  public static INTERFACE: Interface = new Interface(abi)

  constructor(orders: LooksRareData[]) {
    super(Market.LooksRare, orders)
  }

  encode(planner: RoutePlanner): void {
    for (const item of this.orders) {
      const calldata = LooksRareTrade.INTERFACE.encodeFunctionData('matchAskWithTakerBidUsingETHAndWETH', [
        item.takerOrder,
        item.makerOrder,
      ])

      planner.addCommand(CommandType.LOOKS_RARE_721, [
        item.makerOrder.price,
        calldata,
        item.recipient,
        item.makerOrder.collection,
        item.makerOrder.tokenId,
      ])
    }
  }

  getBuyItems(): BuyItem[] {
    let buyItems: BuyItem[] = []
    for (const item of this.orders) {
      buyItems.push({
        tokenAddress: item.makerOrder.collection,
        tokenId: item.makerOrder.tokenId,
        priceInfo: item.makerOrder.price,
        tokenType: TokenType.ERC721,
      })
    }
    return buyItems
  }

  getTotalPrice(): BigNumberish {
    let total = BigNumber.from(0)
    for (const item of this.orders) {
      total = total.add(item.makerOrder.price)
    }
    return total
  }
}
