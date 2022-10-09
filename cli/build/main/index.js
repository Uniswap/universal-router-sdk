#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = void 0;
const tslib_1 = require("tslib");
const commander_1 = require("commander");
const routerCommands = tslib_1.__importStar(require("@uniswap/narwhal-sdk"));
const narwhal_sdk_1 = require("@uniswap/narwhal-sdk");
const ethers_1 = require("ethers");
function main() {
    buildHelpOutput();
    const tokens = process.argv.slice(2);
    if (tokens.includes('-h') || tokens.length === 0) {
        commander_1.program.help();
    }
    const planner = new narwhal_sdk_1.RouterPlanner();
    // else we do our custom parsing
    let index = 0;
    while (index < tokens.length) {
        const { command, type, nextIndex } = parseCommand(tokens, index);
        switch (type) {
            case CommandType.PLAN:
                planner.add(command);
                break;
            case CommandType.SUBPLAN:
                planner.addSubplan(command);
                break;
        }
        index = nextIndex;
    }
    const { commands, state } = planner.plan();
    const encoded = new ethers_1.ethers.utils.AbiCoder().encode(['bytes', 'bytes[]'], [commands, state]);
    console.log(encoded);
}
exports.main = main;
var CommandType;
(function (CommandType) {
    CommandType[CommandType["PLAN"] = 0] = "PLAN";
    CommandType[CommandType["SUBPLAN"] = 1] = "SUBPLAN";
})(CommandType || (CommandType = {}));
function parseCommand(tokens, index) {
    let type = CommandType.PLAN;
    switch (tokens[index]) {
        case '--plan':
        case '-p':
            type = CommandType.PLAN;
            break;
        case '--subplan':
        case '-s':
            type = CommandType.SUBPLAN;
            break;
        default:
            throw new Error(`Unexpected option: ${tokens[index]}`);
    }
    const commandName = tokens[index + 1];
    const args = [];
    index += 2;
    while (index < tokens.length && !['--plan', '-p', '--subplan', '-s'].includes(tokens[index])) {
        args.push(tokens[index]);
        index++;
    }
    return {
        command: getCommand(commandName)(...args),
        type,
        nextIndex: index,
    };
}
function getCommand(input) {
    const command = routerCommands[input];
    if (!command || !(typeof command === 'function')) {
        throw new Error(`Invalid command: ${input}`);
    }
    return command;
}
function buildHelpOutput() {
    commander_1.program
        .name("Narwhal Planner")
        .description("Helper CLI tool for generating weiroll calldata for narwhal")
        .option("-p --plan <commandName> <args...>", "Add a command to the plan. You can add multiple commands.")
        .option("-s --subplan <commandName> <args...>", "Add a subcommand to the plan. You can add multiple subcommands.");
}
main();
//# sourceMappingURL=index.js.map