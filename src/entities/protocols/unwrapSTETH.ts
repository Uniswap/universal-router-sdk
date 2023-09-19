import invariant from 'tiny-invariant'
import { BigNumberish } from 'ethers'
import { RoutePlanner, CommandType } from '../../utils/routerCommands'
import { encodeInputTokenOptions, Permit2Permit } from '../../utils/inputTokens'
import { Command, RouterTradeType, TradeConfig } from '../Command'
import { CONTRACT_BALANCE, ROUTER_AS_RECIPIENT, STETH_ADDRESS } from '../../utils/constants'

export class UnwrapSTETH implements Command {
  readonly tradeType: RouterTradeType = RouterTradeType.UnwrapSTETH
  readonly recipient: string
  readonly amountMinimum: BigNumberish

  constructor(recipient: string, amountMinimum: BigNumberish, chainId: number) {
    this.recipient = recipient
    this.amountMinimum = amountMinimum
  }

  encode(planner: RoutePlanner, _: TradeConfig): void {
    planner.addCommand(CommandType.UNWRAP_STETH, [this.recipient, this.amountMinimum])
  }
}
