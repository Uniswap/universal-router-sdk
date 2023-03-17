import { BigNumber, BigNumberish } from 'ethers'
import { Interface } from '@ethersproject/abi'
import abi from '../../../abis/Seaport.json'
import { BuyItem, Market, NFTTrade, TokenType } from '../NFTTrade'
import { TradeConfig } from '../Command'
import { RoutePlanner, CommandType } from '../../utils/routerCommands'
import { encodeApprovalPermitTransfer, Permit2Permit } from '../../utils/inputTokens'
import { ETH_ADDRESS } from '../../utils/constants'

export type SeaportData = {
  items: Order[]
  recipient: string // address
  protocolAddress: string
  inputCurrency: string
  inputTokenProcessing?: InputTokenProcessing
}

export type InputTokenProcessing = {
  permit2Permit?: Permit2Permit
  protocolApproval: boolean
  permit2TransferFrom: boolean
}

export type FulfillmentComponent = {
  orderIndex: BigNumberish
  itemIndex: BigNumberish
}

export type OfferItem = {
  itemType: BigNumberish // enum
  token: string // address
  identifierOrCriteria: BigNumberish
  startAmount: BigNumberish
  endAmount: BigNumberish
}

export type ConsiderationItem = OfferItem & {
  recipient: string
}

export type Order = {
  parameters: OrderParameters
  signature: string
}

type OrderParameters = {
  offerer: string // address,
  offer: OfferItem[]
  consideration: ConsiderationItem[]
  orderType: BigNumberish // enum
  startTime: BigNumberish
  endTime: BigNumberish
  zoneHash: string // bytes32
  zone: string // address
  salt: BigNumberish
  conduitKey: string // bytes32,
  totalOriginalConsiderationItems: BigNumberish
}

export type AdvancedOrder = Order & {
  numerator: BigNumber // uint120
  denominator: BigNumber // uint120
  extraData: string // bytes
}

export class SeaportTrade extends NFTTrade<SeaportData> {
  public static INTERFACE: Interface = new Interface(abi)
  public static OPENSEA_CONDUIT_KEY: string = '0x0000007b02230091a7ed01230072f7006a004d60a8d4e71d599b8104250f0000'

  constructor(orders: SeaportData[]) {
    super(Market.Seaport, orders)
  }

  encode(planner: RoutePlanner, config: TradeConfig): void {
    for (const order of this.orders) {
      let advancedOrders: AdvancedOrder[] = []
      let orderFulfillments: FulfillmentComponent[][] = order.items.map((_, index) => [
        { orderIndex: index, itemIndex: 0 },
      ])
      let considerationFulFillments: FulfillmentComponent[][] = this.getConsiderationFulfillments(order.items)

      for (const item of order.items) {
        const { advancedOrder } = this.getAdvancedOrderParams(item)
        advancedOrders.push(advancedOrder)
      }

      let calldata: string
      if (advancedOrders.length == 1) {
        calldata = SeaportTrade.INTERFACE.encodeFunctionData('fulfillAdvancedOrder', [
          advancedOrders[0],
          [],
          SeaportTrade.OPENSEA_CONDUIT_KEY,
          order.recipient,
        ])
      } else {
        calldata = SeaportTrade.INTERFACE.encodeFunctionData('fulfillAvailableAdvancedOrders', [
          advancedOrders,
          [],
          orderFulfillments,
          considerationFulFillments,
          SeaportTrade.OPENSEA_CONDUIT_KEY,
          order.recipient,
          100, // TODO: look into making this a better number
        ])
      }

      let ethValue
      if (order.inputCurrency != ETH_ADDRESS) {
        ethValue = 0
        if (!!order.inputTokenProcessing) {
          encodeApprovalPermitTransfer(
            planner,
            order.inputTokenProcessing.protocolApproval
              ? { token: order.inputCurrency, protocol: order.protocolAddress }
              : undefined,
            order.inputTokenProcessing.permit2Permit,
            order.inputTokenProcessing.permit2TransferFrom
              ? { token: order.inputCurrency, amount: this.getTotalOrderPrice(order, order.inputCurrency).toString() }
              : undefined
          )
        }
      } else {
        ethValue = this.getTotalOrderPrice(order, ETH_ADDRESS).toString()
      }

      planner.addCommand(this.commandMap(order.protocolAddress), [ethValue, calldata], config.allowRevert)
    }
  }

  getBuyItems(): BuyItem[] {
    let buyItems: BuyItem[] = []
    for (const order of this.orders) {
      for (const item of order.items) {
        for (const offer of item.parameters.offer) {
          buyItems.push({
            tokenAddress: offer.token,
            tokenId: offer.identifierOrCriteria,
            tokenType: TokenType.ERC721,
          })
        }
      }
    }
    return buyItems
  }

  getTotalOrderPrice(order: SeaportData, token: string = ETH_ADDRESS): BigNumber {
    let totalOrderPrice = BigNumber.from(0)
    for (const item of order.items) {
      totalOrderPrice = totalOrderPrice.add(this.calculateValue(item.parameters.consideration, token))
    }
    return totalOrderPrice
  }

  getTotalPrice(token: string = ETH_ADDRESS): BigNumber {
    let totalPrice = BigNumber.from(0)
    for (const order of this.orders) {
      for (const item of order.items) {
        totalPrice = totalPrice.add(this.calculateValue(item.parameters.consideration, token))
      }
    }
    return totalPrice
  }

  private commandMap(protocolAddress: string): CommandType {
    switch (protocolAddress.toLowerCase()) {
      case '0x00000000006c3852cbef3e08e8df289169ede581': // Seaport v1.1
        return CommandType.SEAPORT
      case '0x00000000000001ad428e4906ae43d8f9852d0dd6': // Seaport v1.4
        return CommandType.SEAPORT_V1_4
      default:
        throw new Error('unsupported Seaport address')
    }
  }

  private getConsiderationFulfillments(protocolDatas: Order[]): FulfillmentComponent[][] {
    let considerationFulfillments: FulfillmentComponent[][] = []
    const considerationRecipients: string[] = []

    for (const i in protocolDatas) {
      const protocolData = protocolDatas[i]

      for (const j in protocolData.parameters.consideration) {
        const item = protocolData.parameters.consideration[j]

        if (considerationRecipients.findIndex((x) => x === item.recipient) === -1) {
          considerationRecipients.push(item.recipient)
        }

        const recipientIndex = considerationRecipients.findIndex((x) => x === item.recipient)

        if (!considerationFulfillments[recipientIndex]) {
          considerationFulfillments.push([
            {
              orderIndex: i,
              itemIndex: j,
            },
          ])
        } else {
          considerationFulfillments[recipientIndex].push({
            orderIndex: i,
            itemIndex: j,
          })
        }
      }
    }
    return considerationFulfillments
  }

  private getAdvancedOrderParams(data: Order): { advancedOrder: AdvancedOrder } {
    const advancedOrder = {
      parameters: data.parameters,
      numerator: BigNumber.from('1'),
      denominator: BigNumber.from('1'),
      signature: data.signature,
      extraData: '0x00',
    }
    return { advancedOrder }
  }

  private calculateValue(considerations: ConsiderationItem[], token: string): BigNumber {
    return considerations.reduce(
      (amt: BigNumber, consideration: ConsiderationItem) =>
        consideration.token == token ? amt.add(consideration.startAmount) : amt,
      BigNumber.from(0)
    )
  }
}
