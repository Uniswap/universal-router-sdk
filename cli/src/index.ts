#!/usr/bin/env node

import { program } from 'commander';

import * as routerCommands from '@uniswap/narwhal-sdk';
import { RouterPlanner, RouterCommand } from '@uniswap/narwhal-sdk';
import { ethers } from 'ethers';

export function main() {
    buildHelpOutput();
    const tokens = process.argv.slice(2);
    if (tokens.includes('-h') || tokens.length === 0) {
        program.help();
    }

    const planner = new RouterPlanner();

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
    const encoded = new ethers.utils.AbiCoder().encode(['bytes', 'bytes[]'], [commands, state]);
    console.log(encoded);
}

enum CommandType {
    PLAN,
    SUBPLAN,
}

function parseCommand(tokens: string[], index: number): { command: RouterCommand, type: CommandType, nextIndex: number } {
    let type: CommandType = CommandType.PLAN;
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

    const commandName = tokens[index + 1] as keyof RouterCommands;
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
    }
}

type RouterCommands = Exclude<typeof routerCommands, routerCommands.RouterPlanner>;

function getCommand<K extends keyof RouterCommands>(input: K): (...args: any[]) => RouterCommand {
    const command = routerCommands[input];

    if (!command || !(typeof command === 'function')) {
        throw new Error(`Invalid command: ${input}`);
    }

    return command as (...args: any[]) => RouterCommand;
}

function buildHelpOutput() {
    program
        .name("Narwhal Planner")
        .description("Helper CLI tool for generating weiroll calldata for narwhal")
        .option("-p --plan <commandName> <args...>", "Add a command to the plan. You can add multiple commands.")
        .option("-s --subplan <commandName> <args...>", "Add a subcommand to the plan. You can add multiple subcommands.");
}

main();
