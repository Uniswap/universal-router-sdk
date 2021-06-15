import * as chai from 'chai';
import { expect } from 'chai';
import { ethers } from 'ethers';
import { Contract, ReturnValue } from '../src/contract';
import { Planner } from '../src/planner';
import * as mathABI from '../abis/Math.json';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

describe('planner', () => {
    let Math: Contract;

    before(() => {
        Math = Contract.fromEthersContract(new ethers.Contract(ZERO_ADDRESS, mathABI.abi));
    });

    it('adds function calls to a list of commands', () => {
        const planner = new Planner();
        const sum1 = planner.addCommand(Math.add(1, 2)) as ReturnValue;
        const sum2 = planner.addCommand(Math.add(3, 4)) as ReturnValue;
        const sum3 = planner.addCommand(Math.add(sum1, sum2)) as ReturnValue;
        // const [commands, state] = planner.plan();

        expect(planner.commands.length).to.equal(3);
        expect(sum1.commandIndex).to.equal(0);
        expect(sum1.dataIndex).to.equal(0);
        expect(sum2.commandIndex).to.equal(1);
        expect(sum2.dataIndex).to.equal(0);
        expect(sum3.commandIndex).to.equal(2);
        expect(sum3.dataIndex).to.equal(0);
    });
});
