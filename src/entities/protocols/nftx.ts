import abi from '../../../abis/NFTXZap.json'
import { Interface } from '@ethersproject/abi'
import { NFTTrade, BuyItem } from '../NFTTrade'
import { RoutePlanner, CommandType } from '../../utils/routerCommands'
import { ethers, BigNumber, BigNumberish } from 'ethers'
import { Currency, CurrencyAmount } from '@uniswap/sdk-core'

export type NFTXData = {
  vaultId: BigNumberish
  vaultAddress: string
}

type NFTXVaultPurchase = {
  vaultAddress: string
  tokenIds: string[]
}

export class NFTXTrade extends NFTTrade<NFTXData> {
  public static INTERFACE: Interface = new Interface(abi)

  constructor(recipient: string, buyItems: BuyItem<NFTXData>[]) {
    super(recipient, buyItems)
  }

  encode(planner: RoutePlanner): void {
    let vaultPurchases: { [keys: string]: NFTXVaultPurchase } = {}
    for (const item of this.buyItems) {
      if (!vaultPurchases[item.data.vaultId.toString()])
        vaultPurchases[item.data.vaultId.toString()] = {
          vaultAddress: item.data.vaultAddress,
          tokenIds: [],
        }
      vaultPurchases[item.data.vaultId.toString()].tokenIds.push(item.tokenId.toString())
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
}
