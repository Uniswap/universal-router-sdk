import abi from '../../../abis/Element.json'
import { Interface } from '@ethersproject/abi'
import { BuyItem, Market, NFTTrade, TokenType } from '../NFTTrade'
import { TradeConfig } from '../Command'
import { RoutePlanner, CommandType } from '../../utils/routerCommands'
import { BigNumber } from 'ethers'

export interface Fee {
  recipient: string
  amount: string
  feeData: string
}

// For now we are not adding ERC1155 support, but we might want it in future
// So structuring the ElementData like this to give us flexibility to support it
type ElementPartialData = {
  maker: string
  taker: string
  expiry: string
  nonce: string
  erc20Token: string
  erc20TokenAmount: string
  fees: Fee[]
}

export type ERC721SellOrder = ElementPartialData & {
  nft: string
  nftId: string
}

export type OrderSignature = {
  signatureType: number // 0 for 721 and 1 for presigned
  v: number
  r: string
  s: string
}

export type ElementData = {
  order: ERC721SellOrder
  signature: OrderSignature
}

export class ElementTrade extends NFTTrade<ElementData> {
  private static ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'.toLowerCase()
  public static INTERFACE: Interface = new Interface(abi)

  constructor(orders: ElementData[]) {
    super(Market.Element, orders)
  }

  encode(planner: RoutePlanner, config: TradeConfig): void {
    for (const item of this.orders) {
      if (item.order.erc20Token.toLowerCase() != ElementTrade.ETH_ADDRESS) throw new Error('Only ETH supported')

      const value = BigNumber.from(item.order.erc20TokenAmount)
      const calldata = ElementTrade.INTERFACE.encodeFunctionData('buyERC721Ex', [
        item.order,
        item.signature,
        item.order.taker, // taker
        '0x', // extraData
      ])

      planner.addCommand(CommandType.ELEMENT_MARKET, [value.toString(), calldata], config.allowRevert)
    }
  }

  getBuyItems(): BuyItem[] {
    let buyItems: BuyItem[] = []
    for (const item of this.orders) {
      buyItems.push({
        tokenAddress: item.order.nft,
        tokenId: item.order.nftId,
        tokenType: TokenType.ERC721,
      })
    }
    return buyItems
  }

  getTotalPrice(): BigNumber {
    let total = BigNumber.from(0)
    for (const item of this.orders) {
      total = total.add(item.order.erc20TokenAmount)
    }
    return total
  }
}
