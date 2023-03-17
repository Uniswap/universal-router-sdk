import abi from '../../../abis/Element.json'
import { Interface } from '@ethersproject/abi'
import { BuyItem, Market, NFTTrade, TokenType } from '../NFTTrade'
import { TradeConfig } from '../Command'
import { RoutePlanner, CommandType } from '../../utils/routerCommands'
import { BigNumber, BigNumberish } from 'ethers'

export type ElementOrderSignature = {
  signatureType: number // 0 for 721 and 1 for presigned
  v: number
  r: string
  s: string
}

export interface Fee {
  recipient: string
  amount: string
  feeData: string
}

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

export type ERC1155SellOrder = ElementPartialData & {
  erc1155Token: string
  erc1155TokenId: string
  erc1155TokenAmount: string
}

export type ElementData = ERC721SellOrder | ERC1155SellOrder

export class ElementTrade extends NFTTrade<ElementData> {
  public static INTERFACE: Interface = new Interface(abi)

  constructor(orders: ElementData[]) {
    super(Market.Element, orders)
  }

  encode(planner: RoutePlanner, config: TradeConfig): void {
    for (const item of this.orders) {
      const functionSelector = ElementTrade.INTERFACE.getSighash(ElementTrade.INTERFACE.getFunction('run'))
      const calldata = functionSelector + item.signedInput.slice(2)

    }
  }

  getBuyItems(): BuyItem[] {

  }

  getTotalPrice(): BigNumber {
    let total = BigNumber.from(0)
    for (const item of this.orders) {
      total = total.add(item.erc20TokenAmount)
    }
    return total
  }
}
