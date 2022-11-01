import { BigNumber, BigNumberish } from 'ethers'

type OfferItem = {
  itemType: BigNumber // enum
  token: string // address
  identifierOrCriteria: BigNumber
  startAmount: BigNumber
  endAmount: BigNumber
}

type ConsiderationItem = OfferItem & {
  recipient: string
}

export type SeaportData = {
  protocol_data: {
    parameters: {
      offerer: string // address
      offer: OfferItem[]
      consideration: ConsiderationItem[]
      orderType: BigNumber // enum
      startTime: BigNumber
      endTime: BigNumber
      zone: string //address
      zoneHash: string // bytes32
      salt: BigNumber
      conduitKey: string // bytes32,
      totalOriginalConsiderationItems: BigNumber
      counter: number
    }
    signature: string
  }
}
