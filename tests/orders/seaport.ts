import { SeaportData, ConsiderationItem } from '../../src/entities/protocols/seaport'
import { BigNumber } from 'ethers'

const SAMPLE_ADDR = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'

export const seaportData2Covens: SeaportData = {
  items: [
    {
      parameters: {
        offerer: '0x0f1fcc9da5db6753c90fbeb46024c056516fbc17',
        offer: [
          {
            itemType: 2,
            token: '0x5180db8F5c931aaE63c74266b211F580155ecac8',
            identifierOrCriteria: '8271',
            startAmount: '1',
            endAmount: '1',
          },
        ],
        consideration: [
          {
            itemType: 0,
            token: '0x0000000000000000000000000000000000000000',
            identifierOrCriteria: '0',
            startAmount: '30525000000000000000',
            endAmount: '30525000000000000000',
            recipient: '0x0f1fcc9DA5DB6753c90fBeB46024c056516FBC17',
          },
          {
            itemType: 0,
            token: '0x0000000000000000000000000000000000000000',
            identifierOrCriteria: '0',
            startAmount: '825000000000000000',
            endAmount: '825000000000000000',
            recipient: '0x8De9C5A032463C561423387a9648c5C7BCC5BC90',
          },
          {
            itemType: 0,
            token: '0x0000000000000000000000000000000000000000',
            identifierOrCriteria: '0',
            startAmount: '1650000000000000000',
            endAmount: '1650000000000000000',
            recipient: '0xac9d54ca08740A608B6C474e5CA07d51cA8117Fa',
          },
        ],
        startTime: '1657325657',
        endTime: '1672881257',
        orderType: 2,
        zone: '0x004C00500000aD104D7DBd00e3ae0A5C00560C00',
        zoneHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
        salt: '196452098662466',
        conduitKey: '0x0000007b02230091a7ed01230072f7006a004d60a8d4e71d599b8104250f0000',
        totalOriginalConsiderationItems: 3,
      },
      signature:
        '0x58073c305ffa6daf8b6279050d9837d88040350a004efe3028fd6cda8aef41cd0819bb209b6ef3b3d6df717180677a3916c15ea669f8251471d3d39ee6abdac31b',
    },
    {
      parameters: {
        offerer: '0x4fdcd0496f4c2d3629c0741626de74d24a683e50',
        offer: [
          {
            itemType: 2,
            token: '0x5180db8F5c931aaE63c74266b211F580155ecac8',
            identifierOrCriteria: '6366',
            startAmount: '1',
            endAmount: '1',
          },
        ],
        consideration: [
          {
            itemType: 0,
            token: '0x0000000000000000000000000000000000000000',
            identifierOrCriteria: '0',
            startAmount: '18500000000000000000',
            endAmount: '18500000000000000000',
            recipient: '0x4fdcD0496F4c2D3629C0741626DE74d24A683E50',
          },
          {
            itemType: 0,
            token: '0x0000000000000000000000000000000000000000',
            identifierOrCriteria: '0',
            startAmount: '500000000000000000',
            endAmount: '500000000000000000',
            recipient: '0x8De9C5A032463C561423387a9648c5C7BCC5BC90',
          },
          {
            itemType: 0,
            token: '0x0000000000000000000000000000000000000000',
            identifierOrCriteria: '0',
            startAmount: '1000000000000000000',
            endAmount: '1000000000000000000',
            recipient: '0xac9d54ca08740A608B6C474e5CA07d51cA8117Fa',
          },
        ],
        startTime: '1660708434',
        endTime: '1676264034',
        orderType: 2,
        zone: '0x004C00500000aD104D7DBd00e3ae0A5C00560C00',
        zoneHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
        salt: '1844479567226754',
        conduitKey: '0x0000007b02230091a7ed01230072f7006a004d60a8d4e71d599b8104250f0000',
        totalOriginalConsiderationItems: 3,
      },
      signature:
        '0x81237739418cadbfd0875476c1d343550166e7099f0430ad581e98245e03db303480cbfda1e2c9aa6f3663d7f5ab86800b72ddeaaf81998179a651eef627e5f81b',
    },
  ],
  recipient: SAMPLE_ADDR,
}

export const seaportValue: BigNumber = calculateSeaportValue(seaportData2Covens.items[0].parameters.consideration).add(
  calculateSeaportValue(seaportData2Covens.items[1].parameters.consideration)
)

function calculateSeaportValue(considerations: ConsiderationItem[]): BigNumber {
  return considerations.reduce(
    (amt: BigNumber, consideration: ConsiderationItem) => amt.add(consideration.startAmount),
    BigNumber.from(0)
  )
}
