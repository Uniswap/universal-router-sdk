import invariant from 'tiny-invariant'
import { BigNumberish } from 'ethers'
import { RoutePlanner, CommandType } from '../../utils/routerCommands'
import { encodeInputTokenOptions, Permit2Permit } from '../../utils/inputTokens'
import { Command, RouterTradeType, TradeConfig } from '../Command'
import { ROUTER_AS_RECIPIENT, WETH_ADDRESS, STETH_ADDRESS } from '../../utils/constants'

export class WrapSTETH implements Command {
  readonly tradeType: RouterTradeType = RouterTradeType.UnwrapSTETH
  readonly permit2Data: Permit2Permit
  readonly stethAddress: string
  readonly amount: BigNumberish

  constructor(amount: BigNumberish, chainId: number, permit2?: Permit2Permit) {
    this.stethAddress = STETH_ADDRESS(chainId)
    this.amount = amount

    if (!!permit2) {
      invariant(
        permit2.details.token.toLowerCase() === this.stethAddress.toLowerCase(),
        `must be permitting STETH address: ${this.stethAddress}`
      )
      invariant(permit2.details.amount >= amount, `Did not permit enough STETH for unwrapSTETH transaction`)
      this.permit2Data = permit2
    }
  }

  encode(planner: RoutePlanner, _: TradeConfig): void {
    encodeInputTokenOptions(planner, {
      permit2Permit: this.permit2Data,
      permit2TransferFrom: {
        token: this.stethAddress,
        amount: this.amount.toString(),
      },
    })
    planner.addCommand(CommandType.WRAP_STETH, [ROUTER_AS_RECIPIENT, this.amount])
  }
}
