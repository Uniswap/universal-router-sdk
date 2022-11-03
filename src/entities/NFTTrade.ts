import { BigNumber, BigNumberish } from 'ethers'
import { CurrencyAmount, Currency } from '@uniswap/sdk-core'
import { SeaportData } from './protocols/seaport'
import { FoundationData } from './protocols/foundation'
import { RoutePlanner } from '../utils/routerCommands'
import { getNativeCurrencyValue } from '../utils/getNativeCurrencyValue'
import { Command } from './Command'

export type SupportedProtocolsData = SeaportData | FoundationData

export abstract class NFTTrade<T> implements Command {
  readonly recipient: string //address
  readonly buyItems: BuyItem<T>[]
  readonly nativeCurrencyValue: BigNumber

  constructor(recipient: string, buyItems: BuyItem<T>[]) {
    this.recipient = recipient
    this.buyItems = buyItems
    this.nativeCurrencyValue = getNativeCurrencyValue(buyItems.map((i) => i.priceInfo))
  }

  abstract encode(planner: RoutePlanner): void
}

export type BuyItem<T> = {
  address: string
  tokenId: BigNumberish
  priceInfo: CurrencyAmount<Currency>
  tokenType: TokenTypes
  data: T
}

export enum Markets {
  Foundation = 'foundation',
  LooksRare = 'looksrare',
  NFT20 = 'nft20',
  NFTX = 'nftx',
  Seaport = 'seaport',
  Sudoswap = 'Sudoswap',
  Cryptopunks = 'cryptopunks',
  X2Y2 = 'x2y2',
}

export enum TokenTypes {
  ERC721 = 'ERC721',
  ERC1155 = 'ERC1155',
  Cryptopunk = 'Cryptopunk',
}
