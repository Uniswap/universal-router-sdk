import abi from '../../../abis/NFT20.json'
import { Interface } from '@ethersproject/abi'
import { NFTTrade, Market, TokenType, BuyItem } from '../NFTTrade'
import { RoutePlanner, CommandType } from '../../utils/routerCommands'
import { ethers, BigNumber, BigNumberish } from 'ethers'
import { CurrencyAmount, Ether } from '@uniswap/sdk-core'

export type NFT20Data = {
  tokenAddress: string,
  tokenIds: BigNumberish[],
  tokenAmounts: BigNumberish[],
  receipient: string,
  fee: BigNumberish,
  isV3: boolean
  value: CurrencyAmount<Currency>
}

export class NFT20Trade extends NFTTrade<NFT20Data> {
  public static INTERFACE: Interface = new Interface(abi)

  constructor(orders: NFT20Data[]) {
    super(Market.NFT20, orders)
  }

  encode(planner: RoutePlanner): void {
    for (const order in this.orders) {
      const calldata = NFT20Trade.INTERFACE.encodeFunctionData('ethForNft', [
        order.tokenAddress,
        order.tokenIds,
        order.tokenAmounts,
        order.recipient,
        order.fee,
        order.isV3,
      ])
      planner.addCommand(CommandType.NFT20, [order.value, calldata])
    }
  }

  getBuyItems(): BuyItem[] {
    let buyItems: BuyItem[] = []
    for (const pool of this.orders) {
      for (const tokenIds of pool.tokenIds) {
        buyItems.push({
          tokenAddress: pool.tokenAddress,
          tokenId: tokenId,
          priceInfo: pool.value,
          tokenType: TokenType.ERC721,
        })
      }
    }

    return buyItems
  }
}
