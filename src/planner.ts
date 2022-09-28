import { ParamType, defaultAbiCoder } from '@ethersproject/abi'
import { hexConcat, hexDataSlice } from '@ethersproject/bytes'
import { CommandType, RouterCommand, RouterParamType } from './routerCommands'

/**
 * Represents a value that can be passed to a function call.
 *
 * This can represent a literal value, a return value from a previous function call,
 * or one of several internal placeholder value types.
 */
export interface Value {
  /** The ethers.js `ParamType` describing the type of this value. */
  readonly param: RouterParamType
}

function isValue(arg: any): arg is Value {
  return (arg as Value).param !== undefined
}

class LiteralValue implements Value {
  readonly param: RouterParamType
  readonly value: string

  constructor(param: RouterParamType, value: string) {
    this.param = param
    this.value = value
  }
}

class ReturnValue implements Value {
  readonly param: RouterParamType
  readonly command: RouterCommand // Function call we want the return value of

  constructor(param: RouterParamType, command: RouterCommand) {
    this.param = param
    this.command = command
  }
}

class StateValue implements Value {
  readonly param: RouterParamType

  constructor() {
    this.param = new RouterParamType('bytes[]', 'array')
  }
}

class SubplanValue implements Value {
  readonly param: RouterParamType
  readonly planner: RouterPlanner

  constructor(planner: RouterPlanner) {
    this.param = new RouterParamType('bytes[]', 'array')
    this.planner = planner
  }
}

function isDynamicType(param?: RouterParamType): boolean {
  if (typeof param === 'undefined') return false

  return ['string', 'bytes', 'array', 'tuple'].includes(param.baseType)
}

function abiEncodeSingle(param: RouterParamType, value: any): LiteralValue {
  if (isDynamicType(param)) {
    return new LiteralValue(param, hexDataSlice(defaultAbiCoder.encode([ParamType.from(param.type)], [value]), 32))
  }
  return new LiteralValue(param, defaultAbiCoder.encode([ParamType.from(param.type)], [value]))
}

export function encodeArg(arg: any, param: RouterParamType): Value {
  if (isValue(arg)) {
    if (arg.param.type !== param.type) {
      // Todo: type casting rules
      throw new Error(`Cannot pass value of type ${arg.param.type} to input of type ${param.type}`)
    }
    return arg
  } else if (arg instanceof RouterPlanner) {
    return new SubplanValue(arg)
  } else {
    return abiEncodeSingle(param, arg)
  }
}

interface RouterPlannerState {
  // Maps from a command to the slot used for its return value
  returnSlotMap: Map<RouterCommand, number>
  // Maps from a literal to the slot used to store it
  literalSlotMap: Map<string, number>
  // An array of unused state slots
  freeSlots: Array<number>
  // Maps from a command to the slots that expire when it's executed
  stateExpirations: Map<RouterCommand, number[]>
  // Maps from a command to the last command that consumes its output
  commandVisibility: Map<RouterCommand, RouterCommand>
  // The initial state array
  state: Array<string>
}

function padArray(a: Array<number>, len: number, value: number): Array<number> {
  return a.concat(new Array<number>(len - a.length).fill(value))
}

export class RouterPlanner {
  /**
   * Represents the current state of the planner.
   * This value can be passed as an argument to a function that accepts a `bytes[]`. At runtime it will
   * be replaced with the current state of the weiroll planner.
   */
  readonly state: StateValue

  /** @hidden */
  commands: RouterCommand[]

  constructor() {
    this.state = new StateValue()
    this.commands = []
  }

  add(command: RouterCommand): ReturnValue | null {
    this.commands.push(command)

    for (const arg of command.args) {
      if (arg instanceof SubplanValue) {
        throw new Error('Only subplans can have arguments of type SubplanValue')
      }
    }

    if (command.fragment.outputs?.length !== 1) {
      return null
    }
    return new ReturnValue(command.fragment.outputs[0], command)
  }

  addSubplan(command: RouterCommand) {
    let hasSubplan = false
    let hasState = false
    for (const arg of command.args) {
      if (arg instanceof SubplanValue) {
        if (hasSubplan) {
          throw new Error('Subplans can only take one planner argument')
        }
        hasSubplan = true
      }
      if (arg instanceof StateValue) {
        if (hasState) {
          throw new Error('Subplans can only take one state argument')
        }
        hasState = true
      }
    }
    if (!hasSubplan || !hasState) {
      throw new Error('Subplans must take planner and state arguments')
    }
    if (!hasSubplan || !hasState) {
      throw new Error('Subplans must take planner and state arguments')
    }

    if (command.fragment.outputs?.length === 1 && command.fragment.outputs[0].type !== 'bytes[]') {
      throw new Error('Subplans must return a bytes[] replacement state or nothing')
    }

    this.commands.push(command)
  }

  private preplan(
    commandVisibility: Map<RouterCommand, RouterCommand>,
    literalVisibility: Map<string, RouterCommand>,
    seen?: Set<RouterCommand>,
    planners?: Set<RouterPlanner>
  ) {
    if (seen === undefined) {
      seen = new Set<RouterCommand>()
    }
    if (planners === undefined) {
      planners = new Set<RouterPlanner>()
    }

    if (planners.has(this)) {
      throw new Error('A planner cannot contain itself')
    }
    planners.add(this)

    // Build visibility maps
    for (let command of this.commands) {
      let inargs = command.args

      for (let arg of inargs) {
        if (arg instanceof ReturnValue) {
          if (!seen.has(arg.command)) {
            throw new Error(`Return value from "${arg.command.fragment.type}" is not visible here`)
          }
          commandVisibility.set(arg.command, command)
        } else if (arg instanceof LiteralValue) {
          literalVisibility.set(arg.value, command)
        } else if (arg instanceof SubplanValue) {
          let subplanSeen = seen
          if (!command.fragment.outputs || command.fragment.outputs.length === 0) {
            // Read-only subplan; return values aren't visible externally
            subplanSeen = new Set<RouterCommand>(seen)
          }
          arg.planner.preplan(commandVisibility, literalVisibility, subplanSeen, planners)
        } else if (!(arg instanceof StateValue)) {
          throw new Error(`Unknown function argument type '${typeof arg}'`)
        }
      }
      seen.add(command)
    }

    return { commandVisibility, literalVisibility }
  }

  private buildCommandArgs(
    command: RouterCommand,
    returnSlotMap: Map<RouterCommand, number>,
    literalSlotMap: Map<string, number>,
    state: Array<string>
  ): Array<number> {
    // Build a list of argument value indexes
    let inargs = command.args

    const args = new Array<number>()
    inargs.forEach((arg) => {
      let slot: number
      if (arg instanceof ReturnValue) {
        slot = returnSlotMap.get(arg.command) as number
      } else if (arg instanceof LiteralValue) {
        slot = literalSlotMap.get(arg.value) as number
      } else if (arg instanceof StateValue) {
        slot = 0xfe
      } else if (arg instanceof SubplanValue) {
        // buildCommands has already built the subplan and put it in the last state slot
        slot = state.length - 1
      } else {
        throw new Error(`Unknown function argument type '${typeof arg}'`)
      }
      args.push(slot)
    })

    return args
  }

  private buildCommands(ps: RouterPlannerState): string {
    const encodedCommands = new Array<string>()
    // Build commands, and add state entries as needed
    for (let command of this.commands) {
      if (command.type === CommandType.SUBPLAN) {
        // Find the subplan
        const subplanner = (command.args.find((arg) => arg instanceof SubplanValue) as SubplanValue).planner
        // Build a list of commands
        const subcommands = subplanner.buildCommands(ps)
        // Encode them and push them to a new state slot
        ps.state.push(hexDataSlice(defaultAbiCoder.encode(['bytes32[]'], [subcommands]), 32))
        // The slot is no longer needed after this command
        ps.freeSlots.push(ps.state.length - 1)
      }

      let flags = command.getFlags()

      const args = this.buildCommandArgs(command, ps.returnSlotMap, ps.literalSlotMap, ps.state)

      // Add any newly unused state slots to the list
      ps.freeSlots = ps.freeSlots.concat(ps.stateExpirations.get(command) || [])

      // Figure out where to put the return value
      let ret = 0xff
      if (ps.commandVisibility.has(command)) {
        if (command.type === CommandType.RAWCALL || command.type === CommandType.SUBPLAN) {
          throw new Error(
            `Return value of ${command.fragment.type} cannot be used to replace state and in another function`
          )
        }
        ret = ps.state.length

        if (ps.freeSlots.length > 0) {
          ret = ps.freeSlots.pop() as number
        }

        // Store the slot mapping
        ps.returnSlotMap.set(command, ret)

        // Make the slot available when it's not needed
        const expiryCommand = ps.commandVisibility.get(command) as RouterCommand
        ps.stateExpirations.set(expiryCommand, (ps.stateExpirations.get(expiryCommand) || []).concat([ret]))

        if (ret === ps.state.length) {
          ps.state.push('0x')
        }

      } else if (command.type === CommandType.RAWCALL || command.type === CommandType.SUBPLAN) {
        if (command.fragment.outputs && command.fragment.outputs.length === 1) {
          ret = 0xfe
        }
      }

      encodedCommands.push(hexConcat([[flags], padArray(args, 6, 0xff), [ret]]))
    }
    return `0x${encodedCommands.join('').replaceAll('0x', '')}`
  }

  /**
   * Builds an execution plan for all the commands added to the planner.
   * @returns `commands` and `state`, which can be passed directly to the weiroll executor
   *          to execute the plan.
   */
  plan(): { commands: string; state: string[] } {
    // Tracks the last time a literal is used in the program
    const literalVisibility = new Map<string, RouterCommand>()
    // Tracks the last time a command's output is used in the program
    const commandVisibility = new Map<RouterCommand, RouterCommand>()

    this.preplan(commandVisibility, literalVisibility)

    // Maps from commands to the slots that expire on execution (if any)
    const stateExpirations = new Map<RouterCommand, number[]>()

    // Tracks the state slot each literal is stored in
    const literalSlotMap = new Map<string, number>()

    const state = new Array<string>()

    // Prepopulate the state and state expirations with literals
    literalVisibility.forEach((lastCommand, literal) => {
      const slot = state.length
      state.push(literal)
      literalSlotMap.set(literal, slot)
      stateExpirations.set(lastCommand, (stateExpirations.get(lastCommand) || []).concat([slot]))
    })

    const ps: RouterPlannerState = {
      returnSlotMap: new Map<RouterCommand, number>(),
      literalSlotMap,
      freeSlots: new Array<number>(),
      stateExpirations,
      commandVisibility,
      state,
    }

    let encodedCommands = this.buildCommands(ps)

    return { commands: encodedCommands, state }
  }
}
