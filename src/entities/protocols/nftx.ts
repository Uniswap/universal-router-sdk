import abi from '../../../abis/NFTXZap.json'
import { Interface } from '@ethersproject/abi'
import { NFTTrade, BuyItem, Market, TokenType } from '../NFTTrade'
import { RoutePlanner, CommandType } from '../../utils/routerCommands'
import { ethers, BigNumber, BigNumberish } from 'ethers'
import { Currency, CurrencyAmount, Ether } from '@uniswap/sdk-core'

export type NFTXData = {
  recipient: string
  tokenAddress: string
  price: BigNumberish
  tokenId: BigNumberish
  vaultId: BigNumberish
  vaultAddress: string
}

type NFTXVaultPurchase = {
  vaultAddress: string
  tokenIds: BigNumberish[]
}

export class NFTXTrade extends NFTTrade<NFTXData> {
  public static INTERFACE: Interface = new Interface(abi)

  constructor(orders: NFTXData[]) {
    super(Market.NFTX, orders)
  }

  encode(planner: RoutePlanner): void {
    let vaultPurchases: { [keys: string]: NFTXVaultPurchase } = {}
    for (const item of this.buyItems) {
      const vaultId = item.data.vaultId.toString()
      if (!vaultPurchases[vaultId]) {
        vaultPurchases[vaultId] = {
          vaultAddress: item.data.vaultAddress,
          tokenIds: [],
        }
      }
      vaultPurchases[vaultId].tokenIds.push(item.tokenId)
    }

    for (const vaultId of Object.keys(vaultPurchases)) {
      const vault = vaultPurchases[vaultId]
      const calldata = NFTXTrade.INTERFACE.encodeFunctionData('buyAndRedeem', [
        vaultId,
        vault.tokenIds.length,
        vault.tokenIds,
        [this.nativeCurrencyValue.currency.wrapped.address, vault.vaultAddress],
        this.recipient,
      ])
      planner.addCommand(CommandType.NFTX, [this.nativeCurrencyValue.quotient.toString(), calldata])
    }
  }

  getBuyItems(): BuyItem[] {
    let buyItems: BuyItem[] = []
    for (const item of this.orders) {
      buyItems.push({
        tokenAddress: item.tokenAddress,
        tokenId: item.tokenId,
        priceInfo: CurrencyAmount.fromRawAmount(Ether, item.price),
        tokenType: TokenType.ERC721
      })
    }
    return buyItems
  }
}
