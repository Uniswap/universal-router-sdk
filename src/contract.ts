"use strict";

import { Contract as EthersContract, ContractInterface } from '@ethersproject/contracts';
import { Interface, FunctionFragment, ParamType, defaultAbiCoder } from '@ethersproject/abi';
import { defineReadOnly, getStatic } from '@ethersproject/properties';
import { hexDataSlice } from '@ethersproject/bytes';

export interface Value {
    readonly param: ParamType;
}

export interface StaticValue extends Value {
    readonly value: string;
}

export interface ReturnValue extends Value {
    readonly commandIndex: number; // Index of the command in the array of planned commands
    readonly dataIndex: number; // Index of the return value in the return data
}

export function isReturnValue(value: any): value is ReturnValue {
    return (value as ReturnValue).commandIndex !== undefined;
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

function abiEncodeSingle(param: ParamType, value: any): StaticValue {
    if(isDynamicType(param)) {
        return {param: param, value: hexDataSlice(defaultAbiCoder.encode([param], [value]), 32)};
    }
    return {param: param, value: defaultAbiCoder.encode([param], [value])};
}

function buildCall(contract: Contract, fragment: FunctionFragment): ContractFunction {
    return function(...args: Array<any>): FunctionCall {
        const encodedArgs = args.map((arg, idx) => {
            const param = fragment.inputs[idx];
            if(isReturnValue(arg)) {
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
