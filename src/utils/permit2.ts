import { ethers } from 'ethers'
import { PermitSingle } from '@uniswap/permit2-sdk'
import { CommandType, RoutePlanner } from './routerCommands'

export interface Permit2Permit extends PermitSingle {
  signature: string
}

const SIGNATURE_LENGTH = 65;
const EIP_2098_SIGNATURE_LENGTH = 64;

export function encodePermit(planner: RoutePlanner, permit: Permit2Permit): void {
  let signature = permit.signature;

  const length = ethers.utils.arrayify(permit.signature).length;
  if (length === SIGNATURE_LENGTH || length === EIP_2098_SIGNATURE_LENGTH) {
    // sanitizes signature to cover edge cases like malformed EIP-2098 sigs and v used as recovery id
    signature = ethers.utils.joinSignature(ethers.utils.splitSignature(permit.signature))
  }

  planner.addCommand(CommandType.PERMIT, [permit, signature])
}
