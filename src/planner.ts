"use strict";

import { Contract as EthersContract, ContractInterface } from '@ethersproject/contracts';
import { Interface, FunctionFragment, ParamType, defaultAbiCoder } from '@ethersproject/abi';
import { defineReadOnly, getStatic } from '@ethersproject/properties';
import { hexConcat, hexDataSlice, hexlify } from '@ethersproject/bytes';
import { Heap } from 'heap-js';

const maxInputs = 7;

export interface Value {
    readonly param: ParamType;
}

function isValue(arg:any): arg is Value {
    return (arg as Value).param !== undefined;
}

export class LiteralValue implements Value {
    readonly param: ParamType;
    readonly value: string;

    constructor(param: ParamType, value: string) {
        defineReadOnly(this, "param", param);
        defineReadOnly(this, "value", value);
    }
}

export class ReturnValue implements Value {
    readonly param: ParamType;
    readonly planner: Planner;
    readonly commandIndex: number; // Index of the command in the array of planned commands

    constructor(param: ParamType, planner: Planner, commandIndex: number) {
        defineReadOnly(this, "param", param);
        defineReadOnly(this, "planner", planner);
        defineReadOnly(this, "commandIndex", commandIndex);
    }
}

export class StateValue implements Value {
    readonly param: ParamType;

    constructor() {
        defineReadOnly(this, "param", ParamType.from('bytes[]'));
    }
}

export interface FunctionCall {
    readonly contract: Contract;
    readonly fragment: FunctionFragment;
    readonly args: Value[];
}

export type ContractFunction = (...args: Array<any>) => FunctionCall;

const paramTypeBytes = new RegExp(/^bytes([0-9]*)$/);
const paramTypeNumber = new RegExp(/^(u?int)([0-9]*)$/);

export function isDynamicType(param: ParamType): boolean {
    return ["string", "bytes", "array", "tuple"].includes(param.baseType);
}

function abiEncodeSingle(param: ParamType, value: any): LiteralValue {
    if(isDynamicType(param)) {
        return new LiteralValue(param, hexDataSlice(defaultAbiCoder.encode([param], [value]), 32));
    }
    return new LiteralValue(param, defaultAbiCoder.encode([param], [value]));
}

function buildCall(contract: Contract, fragment: FunctionFragment): ContractFunction {
    return function(...args: Array<any>): FunctionCall {
        if(args.length != fragment.inputs.length) {
            throw new Error(`Function ${fragment.name} has ${fragment.inputs.length} arguments but ${args.length} provided`);
        }
        const encodedArgs = args.map((arg, idx) => {
            const param = fragment.inputs[idx];
            if(isValue(arg)) {
                if(arg.param.type != param.type) {
                    // Todo: type casting rules
                    throw new Error(`Cannot pass value of type ${arg.param.type} to input of type ${param.type}`);
                }
                return arg;
            } else {
                return abiEncodeSingle(param, arg);
            }
        });
        return {contract, fragment, args: encodedArgs};
    }
}

class BaseContract {
    readonly address: string;
    readonly interface: Interface;
    readonly functions: { [ name: string ]: ContractFunction };

    constructor(address: string, contractInterface: ContractInterface) {
        defineReadOnly(this, "interface", getStatic<(contractInterface: ContractInterface) => Interface>(new.target, "getInterface")(contractInterface));
        defineReadOnly(this, "address", address);
        defineReadOnly(this, "functions", {});

        const uniqueNames: { [ name: string ]: Array<string> } = { };
        const uniqueSignatures: { [ signature: string ]: boolean } = { };
        Object.keys(this.interface.functions).forEach((signature) => {
            const fragment = this.interface.functions[signature];

            // Check that the signature is unique; if not the ABI generation has
            // not been cleaned or may be incorrectly generated
            if (uniqueSignatures[signature]) {
                throw new Error(`Duplicate ABI entry for ${ JSON.stringify(signature) }`);
            }
            uniqueSignatures[signature] = true;

            // Track unique names; we only expose bare named functions if they
            // are ambiguous
            {
                const name = fragment.name;
                if (!uniqueNames[name]) { uniqueNames[name] = [ ]; }
                uniqueNames[name].push(signature);
            }

            if ((<Contract>this)[signature] == null) {
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
            if (signatures.length > 1) { return; }

            const signature = signatures[0];

            // If overwriting a member property that is null, swallow the error
            try {
                if ((<Contract>this)[name] == null) {
                    defineReadOnly(<Contract>this, name, (<Contract>this)[signature]);
                }
            } catch (e) { }

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
    readonly [ key: string ]: ContractFunction | any;
}

export class Planner {
    readonly state: StateValue;
    calls: {call: FunctionCall, replacesState: boolean}[];

    constructor() {
        defineReadOnly(this, "state", new StateValue());
        this.calls = [];
    }

    add(call: FunctionCall): ReturnValue | null {
        for(let arg of call.args) {
            if(arg instanceof ReturnValue) {
                if(arg.planner != this) {
                    throw new Error("Cannot reuse return values across planners");
                }
            }
        }

        const commandIndex = this.calls.length;
        this.calls.push({call, replacesState: false});
        
        if(call.fragment.outputs.length != 1) {
            return null;
        }
        return new ReturnValue(call.fragment.outputs[0], this, commandIndex);
    }

    replaceState(call: FunctionCall) {
        for(let arg of call.args) {
            if(arg instanceof ReturnValue) {
                if(arg.planner != this) {
                    throw new Error("Cannot reuse return values across planners");
                }
            }
        }

        if(call.fragment.outputs.length != 1 || call.fragment.outputs[0].type != 'bytes[]') {
            throw new Error("Function replacing state must return a bytes[]");
        }

        this.calls.push({call, replacesState: true});
    }

    plan(): {commands: string[], state: string[]} {
        // Tracks the last time a literal is used in the program
        let literalVisibility = new Map<string,number>();
        // Tracks the last time a command's output is used in the program
        let commandVisibility:number[] = Array(this.calls.length).fill(-1);

        // Build visibility maps
        for(let i = 0; i < this.calls.length; i++) {
            const {call} = this.calls[i];
            for(let arg of call.args) {
                if(arg instanceof ReturnValue) {
                    commandVisibility[arg.commandIndex] = i;
                } else if(arg instanceof LiteralValue) {
                    literalVisibility.set(arg.value, i);
                } else if(!(arg instanceof StateValue)) {
                    throw new Error(`Unknown function argument type '${typeof arg}'`);
                }
            }
        }

        // Tracks when state slots go out of scope
        type HeapEntry = {slot: number, dies: number};
        let nextDeadSlot = new Heap<HeapEntry>((a, b) => a.dies - b.dies);

        // Tracks the state slot each literal is stored in
        let literalSlotMap = new Map<string,number>();
        // Tracks the state slot each return value is stored in
        let returnSlotMap = Array(this.calls.length);

        let commands: string[] = [];
        let state: string[] = [];

        // Prepopulate the state with literals
        literalVisibility.forEach((dies, literal) => {
            const slot = state.length;
            literalSlotMap.set(literal, slot);
            nextDeadSlot.push({slot, dies});
            state.push(literal);
        });

        // Build commands, and add state entries as needed
        for(let i = 0; i < this.calls.length; i++) {
            const {call, replacesState} = this.calls[i];

            // Build a list of argument value indexes
            const args = new Uint8Array(7).fill(0xff);
            call.args.forEach((arg, j) => {
                let slot;
                if(arg instanceof ReturnValue) {
                    slot = returnSlotMap[arg.commandIndex];
                } else if(arg instanceof LiteralValue) {
                    slot = literalSlotMap.get(arg.value);
                } else if(arg instanceof StateValue) {
                    slot = 0xfe;
                } else {
                    throw new Error(`Unknown function argument type '${typeof arg}'`);
                }
                if(isDynamicType(arg.param)) {
                    slot |= 0x80;
                }
                args[j] = slot;
            });

            // Figure out where to put the return value
            let ret = 0xff;
            if(commandVisibility[i] != -1) {
                if(replacesState) {
                    throw new Error(`Return value of ${call.fragment.name} cannot be used to replace state and in another function`);
                }
                ret = state.length;

                // Is there a spare state slot?
                if(nextDeadSlot.peek().dies <= i) {
                    ret = nextDeadSlot.pop().slot;
                }

                // Store the slot mapping
                returnSlotMap[i] = ret;

                // Make the slot available when it's not needed
                nextDeadSlot.push({slot: ret, dies: commandVisibility[i]});

                if(ret == state.length) {
                    state.push('0x');
                }

                if(isDynamicType(call.fragment.outputs[0])) {
                    ret |= 0x80;
                }
            } else if(replacesState) {
                ret = 0xfe;
            }

            commands.push(hexConcat([
                call.contract.interface.getSighash(call.fragment),
                hexlify(args),
                hexlify([ret]),
                call.contract.address
            ]));
        }

        return {commands, state};
    }
}