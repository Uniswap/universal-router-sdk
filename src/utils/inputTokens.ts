import invariant from 'tiny-invariant'
import { ethers } from 'ethers'
import { PermitSingle } from '@uniswap/permit2-sdk'
import { CommandType, RoutePlanner } from './routerCommands'
import { OPENSEA_CONDUIT_SPENDER_ID, ROUTER_AS_RECIPIENT, SUDOSWAP_SPENDER_ID } from './constants'

export interface Permit2Permit extends PermitSingle {
  signature: string
}

export type ApproveProtocol = {
  token: string
  protocol: string
}

export type Permit2TransferFrom = {
  token: string
  amount: string
  recipient?: string
}

const SIGNATURE_LENGTH = 65
const EIP_2098_SIGNATURE_LENGTH = 64

export function encodePermit(planner: RoutePlanner, permit: Permit2Permit): void {
  let signature = permit.signature

  const length = ethers.utils.arrayify(permit.signature).length
  // signature data provided for EIP-1271 may have length different from ECDSA signature
  if (length === SIGNATURE_LENGTH || length === EIP_2098_SIGNATURE_LENGTH) {
    // sanitizes signature to cover edge cases of malformed EIP-2098 sigs and v used as recovery id
    signature = ethers.utils.joinSignature(ethers.utils.splitSignature(permit.signature))
  }

  planner.addCommand(CommandType.PERMIT2_PERMIT, [permit, signature])
}

// Handles the encoding of commands needed to gather input tokens for a trade
// Approval: The router approving another address to take tokens.
//   note: Only seaport and sudoswap support this action. Approvals are left open.
// Permit: A Permit2 signature-based Permit to allow the router to access a user's tokens
// Transfer: A Permit2 TransferFrom of tokens from a user to either the router or another address
export function encodeHandleInputTokens(
  planner: RoutePlanner,
  approval?: ApproveProtocol,
  permit?: Permit2Permit,
  transfer?: Permit2TransferFrom
) {
  // first ensure that all tokens provided for encoding are the same
  if (!!approval && !!permit) invariant(approval.token === permit.details.token, `inconsistent token`)
  if (!!approval && !!transfer) invariant(approval.token === transfer.token, `inconsistent token`)
  if (!!transfer && !!permit) invariant(transfer.token === permit.details.token, `inconsistent token`)

  // if an approval is required, add it
  if (!!approval) {
    planner.addCommand(CommandType.APPROVE_ERC20, [approval.token, mapApprovalProtocol(approval.protocol)])
  }

  // if this order has a permit, encode it
  if (!!permit) {
    encodePermit(planner, permit)
  }

  if (!!transfer) {
    planner.addCommand(CommandType.PERMIT2_TRANSFER_FROM, [
      transfer.token,
      transfer.recipient ? transfer.recipient : ROUTER_AS_RECIPIENT,
      transfer.amount,
    ])
  }
}

function mapApprovalProtocol(protocolAddress: string): number {
  switch (protocolAddress.toLowerCase()) {
    case '0x00000000006c3852cbef3e08e8df289169ede581': // Seaport v1.1
      return OPENSEA_CONDUIT_SPENDER_ID
    case '0x00000000000001ad428e4906ae43d8f9852d0dd6': // Seaport v1.4
      return OPENSEA_CONDUIT_SPENDER_ID
    case '0x2b2e8cda09bba9660dca5cb6233787738ad68329': // Sudoswap
      return SUDOSWAP_SPENDER_ID
    default:
      throw new Error('unsupported protocol address')
  }
}
