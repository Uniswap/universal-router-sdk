import abi from '../../../abis/Seaport.json'
import { BigNumber, BigNumberish, ethers } from 'ethers'
import { Interface } from '@ethersproject/abi'
import { NFTTrade, BuyItem } from '../NFTTrade'
import { RoutePlanner, CommandType } from '../../utils/routerCommands'
import { Currency, CurrencyAmount } from '@uniswap/sdk-core'

export type SeaportData = {
    parameters: {
      offerer: string // address
      offer: OfferItem[]
      consideration: ConsiderationItem[]
      orderType: BigNumberish // enum
      startTime: BigNumberish
      endTime: BigNumberish
      zone: string //address
      zoneHash: string // bytes32
      salt: BigNumberish
      conduitKey: string // bytes32,
      totalOriginalConsiderationItems: BigNumberish
    }
    signature: string
}

export class SeaportTrade extends NFTTrade<SeaportData> {
  public static INTERFACE: Interface = new Interface(abi)
  public static OPENSEA_CONDUIT_KEY: string = '0x0000007b02230091a7ed01230072f7006a004d60a8d4e71d599b8104250f0000'

  constructor(recipient: string, buyItems: BuyItem<SeaportData>[]) {
    super(recipient, buyItems)
  }

  encode(planner: RoutePlanner): void {
    let advancedOrders: AdvancedOrder[] = []
    let considerationFulFillments: FulfillmentComponent[][] = getConsiderationFulfillments(this.buyItems.map(i => i.data))

    for (const item of this.buyItems) {
      const { advancedOrder } = getAdvancedOrderParams(item.data)
      advancedOrders.push(advancedOrder)
    }

    let calldata: string
    if (advancedOrders.length == 1) {
      calldata = SeaportTrade.INTERFACE.encodeFunctionData('fulfillAdvancedOrder', [
        advancedOrders[0],
        [],
        SeaportTrade.OPENSEA_CONDUIT_KEY,
        this.recipient,
      ])
    } else {
      calldata = SeaportTrade.INTERFACE.encodeFunctionData('fulfillAvailableAdvancedOrders', [
        advancedOrders,
        [],
        [[[0, 0]], [[1, 0]]],
        considerationFulFillments,
        SeaportTrade.OPENSEA_CONDUIT_KEY,
        this.recipient,
        100,
      ])
    }
    planner.addCommand(CommandType.SEAPORT, [this.nativeCurrencyValue.quotient.toString(), calldata])
  }
}

type FulfillmentComponent = {
   orderIndex: number
   itemIndex: number
}

type OfferItem = {
  itemType: BigNumberish // enum
  token: string // address
  identifierOrCriteria: BigNumberish
  startAmount: BigNumberish
  endAmount: BigNumberish
}

type ConsiderationItem = OfferItem & {
  recipient: string
}

export type Order = {
  parameters: {
    offerer: string // address,
    offer: OfferItem[]
    consideration: ConsiderationItem[]
    orderType: BigNumberish // enum
    startTime: BigNumberish
    endTime: BigNumberish
    zoneHash: string // bytes32
    salt: BigNumberish
    conduitKey: string // bytes32,
    totalOriginalConsiderationItems: BigNumberish
  }
  signature: string
}

export type AdvancedOrder = Order & {
  numerator: BigNumber // uint120
  denominator: BigNumber // uint120
  extraData: string // bytes
}

function getAdvancedOrderParams(data: SeaportData): { advancedOrder: AdvancedOrder; value: BigNumber } {
  const advancedOrder = {
    parameters: data.parameters,
    numerator: BigNumber.from('1'),
    denominator: BigNumber.from('1'),
    signature: data.signature,
    extraData: '0x00',
  }
  const value = calculateValue(data.parameters.consideration)
  return { advancedOrder, value }
}

function calculateValue(considerations: ConsiderationItem[]): BigNumber {
  return considerations.reduce(
    (amt: BigNumber, consideration: ConsiderationItem) => amt.add(consideration.startAmount),
    BigNumber.from(0)
  )
}
//
// export type SeaportData = {
//   protocol_data: {
//     parameters: {
//       offerer: string // address
//       offer: OfferItem[]
//       consideration: ConsiderationItem[]
//       orderType: BigNumber // enum
//       startTime: BigNumber
//       endTime: BigNumber
//       zone: string //address
//       zoneHash: string // bytes32
//       salt: BigNumber
//       conduitKey: string // bytes32,
//       totalOriginalConsiderationItems: BigNumber
//       counter: number
//     }
//     signature: string
//   }
// }


function getConsiderationFulfillments(protocolDatas: SeaportData[]): FulfillmentComponent[][] {
  let considerationFulfillments: FulfillmentComponent[][] = []
  const considerationRecipients: string[] = []

  for (const i in protocolDatas) {
    const protocolData = protocolDatas[i]
    for (const j in protocolData.parameters.consideration) {
      const item = protocolData.parameters.consideration[j]

      if (considerationRecipients.findIndex((x) => x === item.recipient) === -1) {
        considerationRecipients.push(item.recipient);
      }

      const recipientIndex = considerationRecipients.findIndex(
        (x) => x === item.recipient
      );

      if (!considerationFulfillments[recipientIndex]) {
        considerationFulfillments.push([{
          orderIndex, itemIndex
        }]);
      } else {
        considerationFulfillments[recipientIndex].push({
          orderIndex,
          itemIndex,
        });
      }
    }
  }
  return []
}
