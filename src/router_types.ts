import { encodeArg } from './planner'

/**
 * CommandFlags
 * @description Flags that modify a command's execution
 * @enum {number}
 */
export enum CommandFlags {
  PERMIT = 0x00,
  TRANSFER = 0x01,
  V3_SWAP_EXACT_IN = 0x02,
  V3_SWAP_EXACT_OUT = 0x03,
  V2_SWAP_EXACT_IN = 0x04,
  V2_SWAP_EXACT_OUT = 0x05,
  CHECK_AMT = 0x06,
  /** A bitmask that selects calltype flags */
  CALLTYPE_MASK = 0x0f,
  /** Specifies that this is an extended command, with an additional command word for indices. Internal use only. */
  EXTENDED_COMMAND = 0x40,
  /** Specifies that the return value of this call should be wrapped in a `bytes`. Internal use only. */
  TUPLE_RETURN = 0x80,
}

export enum CommandType {
  PERMIT,
  TRANSFER,
  V3_SWAP_EXACT_IN,
  V3_SWAP_EXACT_OUT,
  V2_SWAP_EXACT_IN,
  V2_SWAP_EXACT_OUT,
  CHECK_AMT,
  SUBPLAN,
  RAWCALL,
}

export class RouterParamType {
  // The fully qualified type (e.g. "address", "tuple(address)", "uint256[3][]"
  readonly type: string

  // The base type (e.g. "address", "tuple", "array")
  readonly baseType: string

  constructor(_type: string, baseType?: string) {
    this.type = _type
    this.baseType = baseType ?? _type
  }
}

export interface Value {
  readonly param: RouterParamType
}

export interface RouterCallFragment {
  readonly type: CommandType
  readonly inputs?: ReadonlyArray<RouterParamType>
  readonly outputs?: ReadonlyArray<RouterParamType>
}

export class RouterCall {
  readonly fragment: RouterCallFragment
  readonly args: Value[]
  readonly flags: CommandFlags

  constructor(fragment: RouterCallFragment, args: Value[], flags?: CommandFlags) {
    this.fragment = fragment
    this.args = args
    this.flags = flags ?? 0
  }
}

export class RouterCommand {
  readonly type: CommandType
  readonly call: RouterCall

  constructor(call: RouterCall, type: CommandType) {
    this.call = call
    this.type = type
  }
}

const AddressParam = { type: 'address', baseType: 'address' }
const AddressArrayParam = { type: 'address[]', baseType: 'array' }
const Uint256Param = { type: 'uint256', baseType: 'uint256' }
const BytesParam = { type: 'bytes', baseType: 'bytes' }

export class TransferCommand implements RouterCommand {
  readonly type: CommandType
  readonly call: RouterCall

  constructor(...args: any[]) {
    const transferFragment = {
      type: CommandType.TRANSFER,
      inputs: [AddressParam, AddressParam, AddressParam, Uint256Param],
    }
    args = args.map((arg, idx) => encodeArg(arg, transferFragment.inputs[idx]))
    this.call = new RouterCall(transferFragment, args, CommandFlags.TRANSFER)
    this.type = transferFragment.type
  }
}

export class V2ExactInputCommand implements RouterCommand {
  readonly type: CommandType
  readonly call: RouterCall

  constructor(...args: any[]) {
    const v2SwapFragment = {
      type: CommandType.V2_SWAP_EXACT_IN,
      inputs: [Uint256Param, AddressArrayParam, AddressParam],
      outputs: [Uint256Param],
    }

    args = args.map((arg, idx) => encodeArg(arg, v2SwapFragment.inputs[idx]))
    this.call = new RouterCall(v2SwapFragment, args, CommandFlags.V2_SWAP_EXACT_IN)
    this.type = v2SwapFragment.type
  }
}

export class V2ExactOutputCommand implements RouterCommand {
  readonly type: CommandType
  readonly call: RouterCall

  constructor(...args: any[]) {
    const v2SwapFragment = {
      type: CommandType.V2_SWAP_EXACT_OUT,
      inputs: [Uint256Param, Uint256Param, AddressArrayParam, AddressParam],
      outputs: [Uint256Param],
    }

    args = args.map((arg, idx) => encodeArg(arg, v2SwapFragment.inputs[idx]))
    this.call = new RouterCall(v2SwapFragment, args, CommandFlags.V2_SWAP_EXACT_OUT)
    this.type = v2SwapFragment.type
  }
}

export class V3ExactInputCommand implements RouterCommand {
  readonly type: CommandType
  readonly call: RouterCall

  constructor(...args: any[]) {
    const v3SwapFragment = {
      type: CommandType.V3_SWAP_EXACT_IN,
      inputs: [AddressParam, Uint256Param, Uint256Param, BytesParam],
      outputs: [Uint256Param],
    }

    args = args.map((arg, idx) => encodeArg(arg, v3SwapFragment.inputs[idx]))
    this.call = new RouterCall(v3SwapFragment, args, CommandFlags.V3_SWAP_EXACT_IN)
    this.type = v3SwapFragment.type
  }
}

export class CheckAmountGTECommand implements RouterCommand {
  readonly type: CommandType
  readonly call: RouterCall

  constructor(...args: any[]) {
    const checkAmountGTEFragment = {
      type: CommandType.CHECK_AMT,
      inputs: [Uint256Param, Uint256Param],
    }
    args = args.map((arg, idx) => encodeArg(arg, checkAmountGTEFragment.inputs[idx]))
    this.call = new RouterCall(checkAmountGTEFragment, args, CommandFlags.CHECK_AMT)
    this.type = checkAmountGTEFragment.type
  }
}
