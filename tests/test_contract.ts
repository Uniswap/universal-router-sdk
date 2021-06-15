import * as chai from 'chai';
import { expect } from 'chai';
import { ethers } from 'ethers';
import { defaultAbiCoder } from '@ethersproject/abi';
import { Contract } from '../src/contract';
import * as mathABI from '../abis/Math.json';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

describe('contract', () => {
    let Math: Contract;

    before(() => {
        Math = Contract.fromEthersContract(new ethers.Contract(ZERO_ADDRESS, mathABI.abi));
    });

    it('wraps contract objects and exposes their functions', () => {
        expect(Math.add).to.not.be.undefined;
    });

    it('returns a FunctionCall when contract functions are called', () => {
        const result = Math.add(1, 2);

        expect(result.contract).to.equal(Math);
        expect(result.fragment).to.equal(Math.interface.getFunction('add'));
        
        const args = result.args;
        expect(args.length).to.equal(2);
        expect(args[0].param).to.equal(Math.interface.getFunction('add').inputs[0]);
        expect(args[0].value).to.equal(defaultAbiCoder.encode(['uint'], [1]));
        expect(args[1].param).to.equal(Math.interface.getFunction('add').inputs[1]);
        expect(args[1].value).to.equal(defaultAbiCoder.encode(['uint'], [2]));
    });
});
