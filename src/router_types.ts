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

const COMMAND_MAP: { [key in CommandType]?: CommandFlags } = {
  [CommandType.PERMIT]: CommandFlags.PERMIT,
  [CommandType.TRANSFER]: CommandFlags.TRANSFER,
  [CommandType.V3_SWAP_EXACT_IN]: CommandFlags.V3_SWAP_EXACT_IN,
  [CommandType.V3_SWAP_EXACT_OUT]: CommandFlags.V3_SWAP_EXACT_OUT,
  [CommandType.V2_SWAP_EXACT_IN]: CommandFlags.V2_SWAP_EXACT_IN,
  [CommandType.V2_SWAP_EXACT_OUT]: CommandFlags.V2_SWAP_EXACT_OUT,
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

const AddressParam = new RouterParamType('address')
const Uint256Param = new RouterParamType('uint256')
const BytesParam = new RouterParamType('bytes')
const BooleanParam = new RouterParamType('bool')
const AddressArrayParam = new RouterParamType('address[]', 'array')

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

function newCommandType(fragment: RouterCallFragment): (...args: any[]) => RouterCommand {
  function fn(...args: any[]): RouterCommand {
    args = args.map((arg: any, idx: any) => encodeArg(arg, fragment.inputs![idx]))
    const call = new RouterCall(fragment, args, COMMAND_MAP[fragment.type])
    const type = fragment.type
    return new RouterCommand(call, type)
  }
  return fn
}

export const TransferCommand = newCommandType({
  type: CommandType.TRANSFER,
  inputs: [AddressParam, AddressParam, AddressParam, Uint256Param],
})

export const V2ExactInputCommand = newCommandType({
  type: CommandType.V2_SWAP_EXACT_IN,
  inputs: [Uint256Param, AddressArrayParam, AddressParam],
  outputs: [Uint256Param],
})

export const V2ExactOutputCommand = newCommandType({
  type: CommandType.V2_SWAP_EXACT_OUT,
  inputs: [Uint256Param, Uint256Param, AddressArrayParam, AddressParam],
  outputs: [Uint256Param],
})

export const V3ExactInputCommand = newCommandType({
  type: CommandType.V3_SWAP_EXACT_IN,
  inputs: [AddressParam, BooleanParam, Uint256Param, Uint256Param, BytesParam],
  outputs: [Uint256Param],
})

export const CheckAmountGTECommand = newCommandType({
  type: CommandType.CHECK_AMT,
  inputs: [Uint256Param, Uint256Param],
})
