import { BigNumber, BigNumberish, ethers } from 'ethers'

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
