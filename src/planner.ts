"use strict";

import {
    isDynamicType,
    isReturnValue,
    FunctionCall,
    ReturnValue,
    StaticValue,
    Value
} from './contract';

const maxInputs = 6;
const maxOutputs = 2;

export class Planner {
    commands: FunctionCall[];

    constructor() {
        this.commands = [];
    }

    addCommand(command: FunctionCall): null | ReturnValue | ReturnValue[] {
        const commandIndex = this.commands.length;
        this.commands.push(command);
        
        if(command.fragment.outputs.length == 0) {
            return null;
        } else if(command.fragment.outputs.length == 1) {
            return {commandIndex, dataIndex: 0, param: command.fragment.outputs[0]};
        } else {
            return command.fragment.outputs.map((param, dataIndex) => ({commandIndex, dataIndex, param}));
        }
    }
}