import { ContractInterface } from '@ethersproject/contracts';
import type { Contract as EthersContract } from '@ethersproject/contracts';
import { Interface, ParamType, defaultAbiCoder } from '@ethersproject/abi';
import type { FunctionFragment } from '@ethersproject/abi';
import { defineReadOnly, getStatic } from '@ethersproject/properties';
import { hexConcat, hexDataSlice, hexlify } from '@ethersproject/bytes';

export interface Value {
  readonly param: ParamType;
}

function isValue(arg: any): arg is Value {
  return (arg as Value).param !== undefined;
}

class LiteralValue implements Value {
  readonly param: ParamType;
  readonly value: string;

  constructor(param: ParamType, value: string) {
    this.param = param;
    this.value = value;
  }
}

class ReturnValue implements Value {
  readonly param: ParamType;
  readonly command: Command; // Function call we want the return value of

  constructor(param: ParamType, command: Command) {
    this.param = param;
    this.command = command;
  }
}

class StateValue implements Value {
  readonly param: ParamType;

  constructor() {
    this.param = ParamType.from('bytes[]');
  }
}

class SubplanValue implements Value {
  readonly param: ParamType;
  readonly planner: Planner;

  constructor(planner: Planner) {
    this.param = ParamType.from('bytes[]');
    this.planner = planner;
  }
}

export interface FunctionCall {
  readonly contract: Contract;
  readonly fragment: FunctionFragment;
  readonly args: Value[];
}

export type ContractFunction = (...args: Array<any>) => FunctionCall;

export function isDynamicType(param?: ParamType): boolean {
  if (typeof param === 'undefined') return false;

  return ['string', 'bytes', 'array', 'tuple'].includes(param.baseType);
}

function abiEncodeSingle(param: ParamType, value: any): LiteralValue {
  if (isDynamicType(param)) {
    return new LiteralValue(
      param,
      hexDataSlice(defaultAbiCoder.encode([param], [value]), 32)
    );
  }
  return new LiteralValue(param, defaultAbiCoder.encode([param], [value]));
}

function buildCall(
  contract: Contract,
  fragment: FunctionFragment
): ContractFunction {
  return function call(...args: Array<any>): FunctionCall {
    if (args.length !== fragment.inputs.length) {
      throw new Error(
        `Function ${fragment.name} has ${fragment.inputs.length} arguments but ${args.length} provided`
      );
    }

    const encodedArgs = args.map((arg, idx) => {
      const param = fragment.inputs[idx];
      if (isValue(arg)) {
        if (arg.param.type !== param.type) {
          // Todo: type casting rules
          throw new Error(
            `Cannot pass value of type ${arg.param.type} to input of type ${param.type}`
          );
        }
        return arg;
      } else if (arg instanceof Planner) {
        return new SubplanValue(arg);
      } else {
        return abiEncodeSingle(param, arg);
      }
    });

    return { contract, fragment, args: encodedArgs };
  };
}

class BaseContract {
  readonly address: string;
  readonly interface: Interface;
  readonly functions: { [name: string]: ContractFunction };

  constructor(address: string, contractInterface: ContractInterface) {
    this.interface = getStatic<
      (contractInterface: ContractInterface) => Interface
    >(
      new.target,
      'getInterface'
    )(contractInterface);
    this.address = address;
    this.functions = {};

    const uniqueNames: { [name: string]: Array<string> } = {};
    const uniqueSignatures: { [signature: string]: boolean } = {};
    Object.keys(this.interface.functions).forEach((signature) => {
      const fragment = this.interface.functions[signature];

      // Check that the signature is unique; if not the ABI generation has
      // not been cleaned or may be incorrectly generated
      if (uniqueSignatures[signature]) {
        throw new Error(`Duplicate ABI entry for ${JSON.stringify(signature)}`);
      }
      uniqueSignatures[signature] = true;

      // Track unique names; we only expose bare named functions if they
      // are ambiguous
      {
        const name = fragment.name;
        if (!uniqueNames[name]) {
          uniqueNames[name] = [];
        }
        uniqueNames[name].push(signature);
      }

      if ((this as Contract)[signature] == null) {
        defineReadOnly<any, any>(this, signature, buildCall(this, fragment));
      }

      // We do not collapse simple calls on this bucket, which allows
      // frameworks to safely use this without introspection as well as
      // allows decoding error recovery.
      if (this.functions[signature] == null) {
        defineReadOnly(this.functions, signature, buildCall(this, fragment));
      }
    });

    Object.keys(uniqueNames).forEach((name) => {
      // Ambiguous names to not get attached as bare names
      const signatures = uniqueNames[name];
      if (signatures.length > 1) {
        return;
      }

      const signature = signatures[0];

      // If overwriting a member property that is null, swallow the error
      try {
        if ((this as Contract)[name] == null) {
          defineReadOnly(this as Contract, name, (this as Contract)[signature]);
        }
      } catch (e) {}

      if (this.functions[name] == null) {
        defineReadOnly(this.functions, name, this.functions[signature]);
      }
    });
  }

  static fromEthersContract(contract: EthersContract): Contract {
    return new Contract(contract.address, contract.interface);
  }

  static getInterface(contractInterface: ContractInterface): Interface {
    if (Interface.isInterface(contractInterface)) {
      return contractInterface;
    }
    return new Interface(contractInterface);
  }
}

export class Contract extends BaseContract {
  // The meta-class properties
  readonly [key: string]: ContractFunction | any;
}

enum CommandType {
  CALL,
  RAWCALL,
  SUBPLAN,
}

class Command {
  readonly call: FunctionCall;
  readonly type: CommandType;

  constructor(call: FunctionCall, type: CommandType) {
    this.call = call;
    this.type = type;
  }
}

interface PlannerState {
  // Maps from a command to the slot used for its return value
  returnSlotMap: Map<Command, number>;
  // Maps from a literal to the slot used to store it
  literalSlotMap: Map<string, number>;
  // An array of unused state slots
  freeSlots: Array<number>;
  // Maps from a command to the slots that expire when it's executed
  stateExpirations: Map<Command, number[]>;
  // Maps from a command to the last command that consumes its output
  commandVisibility: Map<Command, Command>;
  // The initial state array
  state: Array<string>;
}

export class Planner {
  readonly state: StateValue;
  commands: Command[];

  constructor() {
    this.state = new StateValue();
    this.commands = [];
  }

  add(call: FunctionCall): ReturnValue | null {
    const command = new Command(call, CommandType.CALL);
    this.commands.push(command);

    for (const arg of call.args) {
      if (arg instanceof SubplanValue) {
        throw new Error(
          'Only subplans can have arguments of type SubplanValue'
        );
      }
    }

    if (call.fragment.outputs?.length !== 1) {
      return null;
    }
    return new ReturnValue(call.fragment.outputs[0], command);
  }

  addSubplan(call: FunctionCall) {
    let hasSubplan = false;
    let hasState = false;
    for (const arg of call.args) {
      if (arg instanceof SubplanValue) {
        if (hasSubplan) {
          throw new Error('Subplans can only take one planner argument');
        }
        hasSubplan = true;
      }
      if (arg instanceof StateValue) {
        if (hasState) {
          throw new Error('Subplans can only take one state argument');
        }
        hasState = true;
      }
    }
    if (!hasSubplan || !hasState) {
      throw new Error('Subplans must take planner and state arguments');
    }

    if (
      call.fragment.outputs?.length === 1 &&
      call.fragment.outputs[0].type !== 'bytes[]'
    ) {
      throw new Error(
        'Subplans must return a bytes[] replacement state or nothing'
      );
    }

    this.commands.push(new Command(call, CommandType.SUBPLAN));
  }

  replaceState(call: FunctionCall) {
    if (
      call.fragment.outputs?.length !== 1 ||
      call.fragment.outputs[0].type !== 'bytes[]'
    ) {
      throw new Error('Function replacing state must return a bytes[]');
    }

    this.commands.push(new Command(call, CommandType.RAWCALL));
  }

  private preplan(
    commandVisibility: Map<Command, Command>,
    literalVisibility: Map<string, Command>,
    seen?: Set<Command>,
    planners?: Set<Planner>
  ) {
    if (seen === undefined) {
      seen = new Set<Command>();
    }
    if (planners === undefined) {
      planners = new Set<Planner>();
    }

    if (planners.has(this)) {
      throw new Error('A planner cannot contain itself');
    }
    planners.add(this);

    // Build visibility maps
    for (let command of this.commands) {
      for (let arg of command.call.args) {
        if (arg instanceof ReturnValue) {
          if (!seen.has(arg.command)) {
            throw new Error(
              `Return value from "${arg.command.call.fragment.name}" is not visible here`
            );
          }
          commandVisibility.set(arg.command, command);
        } else if (arg instanceof LiteralValue) {
          literalVisibility.set(arg.value, command);
        } else if (arg instanceof SubplanValue) {
          let subplanSeen = seen;
          if (
            !command.call.fragment.outputs ||
            command.call.fragment.outputs.length === 0
          ) {
            // Read-only subplan; return values aren't visible externally
            subplanSeen = new Set<Command>(seen);
          }
          arg.planner.preplan(
            commandVisibility,
            literalVisibility,
            subplanSeen,
            planners
          );
        } else if (!(arg instanceof StateValue)) {
          throw new Error(`Unknown function argument type '${typeof arg}'`);
        }
      }
      seen.add(command);
    }

    return { commandVisibility, literalVisibility };
  }

  private buildCommandArgs(
    command: Command,
    returnSlotMap: Map<Command, number>,
    literalSlotMap: Map<string, number>,
    state: Array<string>
  ): string {
    // Build a list of argument value indexes
    const args = new Uint8Array(7).fill(0xff);
    command.call.args.forEach((arg, j) => {
      let slot: number;
      if (arg instanceof ReturnValue) {
        slot = returnSlotMap.get(arg.command) as number;
      } else if (arg instanceof LiteralValue) {
        slot = literalSlotMap.get(arg.value) as number;
      } else if (arg instanceof StateValue) {
        slot = 0xfe;
      } else if (arg instanceof SubplanValue) {
        // buildCommands has already built the subplan and put it in the last state slot
        slot = state.length - 1;
      } else {
        throw new Error(`Unknown function argument type '${typeof arg}'`);
      }
      if (isDynamicType(arg.param)) {
        slot |= 0x80;
      }
      args[j] = slot;
    });

    return hexlify(args);
  }

  private buildCommands(ps: PlannerState): Array<string> {
    const encodedCommands = new Array<string>();
    // Build commands, and add state entries as needed
    for (let command of this.commands) {
      if (command.type === CommandType.SUBPLAN) {
        // Find the subplan
        const subplanner = (
          command.call.args.find(
            (arg) => arg instanceof SubplanValue
          ) as SubplanValue
        ).planner;
        // Build a list of commands
        const subcommands = subplanner.buildCommands(ps);
        // Encode them and push them to a new state slot
        ps.state.push(
          hexDataSlice(defaultAbiCoder.encode(['bytes32[]'], [subcommands]), 32)
        );
        // The slot is no longer needed after this command
        ps.freeSlots.push(ps.state.length - 1);
      }

      const args = this.buildCommandArgs(
        command,
        ps.returnSlotMap,
        ps.literalSlotMap,
        ps.state
      );

      // Add any newly unused state slots to the list
      ps.freeSlots = ps.freeSlots.concat(
        ps.stateExpirations.get(command) || []
      );

      // Figure out where to put the return value
      let ret = 0xff;
      if (ps.commandVisibility.has(command)) {
        if (
          command.type === CommandType.RAWCALL ||
          command.type === CommandType.SUBPLAN
        ) {
          throw new Error(
            `Return value of ${command.call.fragment.name} cannot be used to replace state and in another function`
          );
        }
        ret = ps.state.length;

        if (ps.freeSlots.length > 0) {
          ret = ps.freeSlots.pop() as number;
        }

        // Store the slot mapping
        ps.returnSlotMap.set(command, ret);

        // Make the slot available when it's not needed
        const expiryCommand = ps.commandVisibility.get(command) as Command;
        ps.stateExpirations.set(
          expiryCommand,
          (ps.stateExpirations.get(expiryCommand) || []).concat([ret])
        );

        if (ret === ps.state.length) {
          ps.state.push('0x');
        }

        if (isDynamicType(command.call.fragment.outputs?.[0])) {
          ret |= 0x80;
        }
      } else if (
        command.type === CommandType.RAWCALL ||
        command.type === CommandType.SUBPLAN
      ) {
        if (
          command.call.fragment.outputs &&
          command.call.fragment.outputs.length === 1
        ) {
          ret = 0xfe;
        }
      }

      encodedCommands.push(
        hexConcat([
          command.call.contract.interface.getSighash(command.call.fragment),
          args,
          hexlify([ret]),
          command.call.contract.address,
        ])
      );
    }
    return encodedCommands;
  }

  plan(): { commands: string[]; state: string[] } {
    // Tracks the last time a literal is used in the program
    const literalVisibility = new Map<string, Command>();
    // Tracks the last time a command's output is used in the program
    const commandVisibility = new Map<Command, Command>();

    this.preplan(commandVisibility, literalVisibility);

    // Maps from commands to the slots that expire on execution (if any)
    const stateExpirations = new Map<Command, number[]>();

    // Tracks the state slot each literal is stored in
    const literalSlotMap = new Map<string, number>();

    const state = new Array<string>();

    // Prepopulate the state and state expirations with literals
    literalVisibility.forEach((lastCommand, literal) => {
      const slot = state.length;
      state.push(literal);
      literalSlotMap.set(literal, slot);
      stateExpirations.set(
        lastCommand,
        (stateExpirations.get(lastCommand) || []).concat([slot])
      );
    });

    const ps: PlannerState = {
      returnSlotMap: new Map<Command, number>(),
      literalSlotMap,
      freeSlots: new Array<number>(),
      stateExpirations,
      commandVisibility,
      state,
    };

    let encodedCommands = this.buildCommands(ps);

    return { commands: encodedCommands, state };
  }
}
