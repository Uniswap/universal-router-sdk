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
  SEAPORT = 0x06,
  WRAP_ETH = 0x07,
  UNWRAP_WETH = 0x08,
  SWEEP = 0x09,
  NFTX = 0x0a,
  LOOKS_RARE = 0x0b,
  X2Y2 = 0x0c,

  /** A bitmask that selects calltype flags */
  CALLTYPE_MASK = 0x0f,
  /** Specifies whether the command is allowed to revert. */
  ALLOW_REVERT = 0x80,
}

export enum CommandType {
  PERMIT,
  TRANSFER,
  SWEEP,
  V3_SWAP_EXACT_IN,
  V3_SWAP_EXACT_OUT,
  V2_SWAP_EXACT_IN,
  V2_SWAP_EXACT_OUT,
  SEAPORT,
  NFTX,
  LOOKS_RARE,
  X2Y2,
  WRAP_ETH,
  UNWRAP_WETH,
  SUBPLAN,
  RAWCALL,
}

const COMMAND_MAP: { [key in CommandType]?: CommandFlags } = {
  [CommandType.PERMIT]: CommandFlags.PERMIT,
  [CommandType.TRANSFER]: CommandFlags.TRANSFER,
  [CommandType.SWEEP]: CommandFlags.SWEEP,
  [CommandType.V3_SWAP_EXACT_IN]: CommandFlags.V3_SWAP_EXACT_IN,
  [CommandType.V3_SWAP_EXACT_OUT]: CommandFlags.V3_SWAP_EXACT_OUT,
  [CommandType.V2_SWAP_EXACT_IN]: CommandFlags.V2_SWAP_EXACT_IN,
  [CommandType.V2_SWAP_EXACT_OUT]: CommandFlags.V2_SWAP_EXACT_OUT,
  [CommandType.SEAPORT]: CommandFlags.SEAPORT,
  [CommandType.NFTX]: CommandFlags.NFTX,
  [CommandType.LOOKS_RARE]: CommandFlags.LOOKS_RARE,
  [CommandType.X2Y2]: CommandFlags.X2Y2,
  [CommandType.WRAP_ETH]: CommandFlags.WRAP_ETH,
  [CommandType.UNWRAP_WETH]: CommandFlags.UNWRAP_WETH,
}

const REVERTABLE_COMMANDS = new Set<CommandType>([
  CommandType.SEAPORT,
  CommandType.NFTX,
  CommandType.LOOKS_RARE,
  CommandType.SUBPLAN,
])

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
const AddressArrayParam = new RouterParamType('address[]', 'array')

export interface Value {
  readonly param: RouterParamType
}

export interface RouterCallFragment {
  readonly type: CommandType
  readonly inputs?: ReadonlyArray<RouterParamType>
  readonly outputs?: ReadonlyArray<RouterParamType>
}

export class RouterCommand {
  readonly fragment: RouterCallFragment
  readonly args: Value[]
  readonly type: CommandType
  private _flags: CommandFlags

  constructor(fragment: RouterCallFragment, args: Value[], type: CommandType) {
    this.type = type
    this.fragment = fragment
    this.args = args
    this._flags = COMMAND_MAP[type]!
  }

  getFlags(): CommandFlags {
    return this._flags
  }

  allowRevert(): RouterCommand {
    if (!REVERTABLE_COMMANDS.has(this.type)) {
      throw new Error(`command type: ${CommandType[this.type]} cannot be allowed to revert`)
    }
    this._flags = this._flags | CommandFlags.ALLOW_REVERT
    return this
  }
}

function initializeCommandType(fragment: RouterCallFragment): (...args: any[]) => RouterCommand {
  function fn(...args: any[]): RouterCommand {
    args = args.map((arg: any, idx: any) => encodeArg(arg, fragment.inputs![idx]))
    return new RouterCommand(fragment, args, fragment.type)
  }
  return fn
}

export const TransferCommand = initializeCommandType({
  type: CommandType.TRANSFER,
  inputs: [AddressParam, AddressParam, Uint256Param],
})

export const SweepCommand = initializeCommandType({
  type: CommandType.SWEEP,
  inputs: [AddressParam, AddressParam, Uint256Param],
})

export const V2ExactInputCommand = initializeCommandType({
  type: CommandType.V2_SWAP_EXACT_IN,
  inputs: [Uint256Param, AddressArrayParam, AddressParam],
  outputs: [Uint256Param],
})

export const V2ExactOutputCommand = initializeCommandType({
  type: CommandType.V2_SWAP_EXACT_OUT,
  inputs: [Uint256Param, Uint256Param, AddressArrayParam, AddressParam],
  outputs: [Uint256Param],
})

export const V3ExactInputCommand = initializeCommandType({
  type: CommandType.V3_SWAP_EXACT_IN,
  inputs: [AddressParam, Uint256Param, Uint256Param, BytesParam],
  outputs: [Uint256Param],
})

export const V3ExactOutputCommand = initializeCommandType({
  type: CommandType.V3_SWAP_EXACT_OUT,
  inputs: [AddressParam, Uint256Param, Uint256Param, BytesParam],
  outputs: [Uint256Param],
})

export const SeaportCommand = initializeCommandType({
  type: CommandType.SEAPORT,
  inputs: [Uint256Param, BytesParam],
})

export const NFTXCommand = initializeCommandType({
  type: CommandType.NFTX,
  inputs: [Uint256Param, BytesParam],
})

export const LooksRareCommand = initializeCommandType({
  type: CommandType.LOOKS_RARE,
  /// For call: Value, Data. Then for Transfer: Token, Recipient, token ID
  inputs: [Uint256Param, BytesParam, AddressParam, AddressParam, Uint256Param],
})

export const X2Y2Command = initializeCommandType({
  type: CommandType.X2Y2,
  /// For call: Value, Data. Then for Transfer: Token, Recipient, token ID
  inputs: [Uint256Param, BytesParam, AddressParam, AddressParam, Uint256Param],
})

export const WrapETHCommand = initializeCommandType({
  type: CommandType.WRAP_ETH,
  inputs: [AddressParam, Uint256Param],
})

export const UnwrapWETHCommand = initializeCommandType({
  type: CommandType.UNWRAP_WETH,
  inputs: [AddressParam, Uint256Param],
})
