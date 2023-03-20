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
  private static SENDER_AS_TAKER = '0x0000000000000000000000000000000000000000'
  private static ETH_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'.toLowerCase()
  public static INTERFACE: Interface = new Interface(abi)

  constructor(orders: ElementData[]) {
    super(Market.Element, orders)
  }

  /// @dev If there are fees, we have to send an ETH value of the erc20TokenAmount + sum of fees
  /// However, for the calldata we have to send the original erc20TokenAmount, so we separate the logic here 
  /// so we never directly edit the original order object
  applyFeesToAmount(erc20TokenAmount: string, fees: Fee[]): string {
    if(fees) {
      const feeSum = fees.reduce((acc, fee) => {
        return acc.add(BigNumber.from(fee.amount))
      }, BigNumber.from(0))
      if(feeSum.gt(erc20TokenAmount)) throw new Error('Fees cannot be greater than order amount')
      erc20TokenAmount = BigNumber.from(erc20TokenAmount).add(feeSum).toString()
    }
    return erc20TokenAmount
  }

  encode(planner: RoutePlanner, config: TradeConfig): void {
    for (const item of this.orders) {
      if (item.order.erc20Token.toLowerCase() != ElementTrade.ETH_ADDRESS) throw new Error('Only ETH supported')
      
      const erc20TokenAmount = this.applyFeesToAmount(item.order.erc20TokenAmount, item.order.fees)
      const value = BigNumber.from(erc20TokenAmount)

      const calldata = ElementTrade.INTERFACE.encodeFunctionData('buyERC721Ex', [
        item.order,
        item.signature,
        item.order.taker, // taker
        '0x', // extraData
      ])

      planner.addCommand(CommandType.ELEMENT_MARKET, [value.toString(), calldata], config.allowRevert)
      if(item.order.taker == ElementTrade.SENDER_AS_TAKER) {
        // TODO: we need to add an input for the eventual recipient of the NFT
        planner.addCommand(CommandType.SWEEP_ERC721, [item.order.nft, item.order.taker, item.order.nftId])
      }
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
      total = total.add(this.applyFeesToAmount(item.order.erc20TokenAmount, item.order.fees))
    }
    return total
  }
}
