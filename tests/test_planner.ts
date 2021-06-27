import { expect } from 'chai';
import { ethers } from 'ethers';
import { hexConcat, hexDataSlice } from '@ethersproject/bytes';
import { defaultAbiCoder } from '@ethersproject/abi';
import { Contract, Planner } from '../src/planner';
import * as mathABI from '../abis/Math.json';
import * as stringsABI from '../abis/Strings.json';

const SAMPLE_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

describe('Contract', () => {
  let Math: Contract;

  before(() => {
    Math = Contract.fromEthersContract(
      new ethers.Contract(SAMPLE_ADDRESS, mathABI.abi)
    );
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

describe('Planner', () => {
  let Math: Contract;
  let Strings: Contract;

  before(() => {
    Math = Contract.fromEthersContract(
      new ethers.Contract(SAMPLE_ADDRESS, mathABI.abi)
    );
    Strings = Contract.fromEthersContract(
      new ethers.Contract(SAMPLE_ADDRESS, stringsABI.abi)
    );
  });

  it('adds function calls to a list of commands', () => {
    const planner = new Planner();
    const sum1 = planner.add(Math.add(1, 2));
    const sum2 = planner.add(Math.add(3, 4));
    planner.add(Math.add(sum1, sum2));

    expect(planner.commands.length).to.equal(3);
  });

  it('plans a simple program', () => {
    const planner = new Planner();
    planner.add(Math.add(1, 2));
    const { commands, state } = planner.plan();

    expect(commands.length).to.equal(1);
    expect(commands[0]).to.equal(
      '0x771602f70001ffffffffffffeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
    );

    expect(state.length).to.equal(2);
    expect(state[0]).to.equal(defaultAbiCoder.encode(['uint'], [1]));
    expect(state[1]).to.equal(defaultAbiCoder.encode(['uint'], [2]));
  });

  it('deduplicates identical literals', () => {
    const planner = new Planner();
    planner.add(Math.add(1, 1));
    const { state } = planner.plan();

    expect(state.length).to.equal(1);
  });

  it('plans a program that uses return values', () => {
    const planner = new Planner();
    const sum1 = planner.add(Math.add(1, 2));
    planner.add(Math.add(sum1, 3));
    const { commands, state } = planner.plan();

    expect(commands.length).to.equal(2);
    expect(commands[0]).to.equal(
      '0x771602f70001ffffffffff01eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
    );
    expect(commands[1]).to.equal(
      '0x771602f70102ffffffffffffeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
    );

    expect(state.length).to.equal(3);
    expect(state[0]).to.equal(defaultAbiCoder.encode(['uint'], [1]));
    expect(state[1]).to.equal(defaultAbiCoder.encode(['uint'], [2]));
    expect(state[2]).to.equal(defaultAbiCoder.encode(['uint'], [3]));
  });

  it('plans a program that needs extra state slots for intermediate values', () => {
    const planner = new Planner();
    const sum1 = planner.add(Math.add(1, 1));
    planner.add(Math.add(1, sum1));
    const { commands, state } = planner.plan();

    expect(commands.length).to.equal(2);
    expect(commands[0]).to.equal(
      '0x771602f70000ffffffffff01eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
    );
    expect(commands[1]).to.equal(
      '0x771602f70001ffffffffffffeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
    );

    expect(state.length).to.equal(2);
    expect(state[0]).to.equal(defaultAbiCoder.encode(['uint'], [1]));
    expect(state[1]).to.equal('0x');
  });

  it('plans a program that takes dynamic arguments', () => {
    const planner = new Planner();
    planner.add(Strings.strlen('Hello, world!'));
    const { commands, state } = planner.plan();

    expect(commands.length).to.equal(1);
    expect(commands[0]).to.equal(
      '0x367bbd7880ffffffffffffffeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
    );

    expect(state.length).to.equal(1);
    expect(state[0]).to.equal(
      hexDataSlice(defaultAbiCoder.encode(['string'], ['Hello, world!']), 32)
    );
  });

  it('plans a program that returns dynamic arguments', () => {
    const planner = new Planner();
    planner.add(Strings.strcat('Hello, ', 'world!'));
    const { commands, state } = planner.plan();

    expect(commands.length).to.equal(1);
    expect(commands[0]).to.equal(
      '0xd824ccf38081ffffffffffffeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
    );

    expect(state.length).to.equal(2);
    expect(state[0]).to.equal(
      hexDataSlice(defaultAbiCoder.encode(['string'], ['Hello, ']), 32)
    );
    expect(state[1]).to.equal(
      hexDataSlice(defaultAbiCoder.encode(['string'], ['world!']), 32)
    );
  });

  it('plans a program that takes a dynamic argument from a return value', () => {
    const planner = new Planner();
    const str = planner.add(Strings.strcat('Hello, ', 'world!'));
    planner.add(Strings.strlen(str));
    const { commands, state } = planner.plan();

    expect(commands.length).to.equal(2);
    expect(commands[0]).to.equal(
      '0xd824ccf38081ffffffffff81eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
    );
    expect(commands[1]).to.equal(
      '0x367bbd7881ffffffffffffffeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
    );

    expect(state.length).to.equal(2);
    expect(state[0]).to.equal(
      hexDataSlice(defaultAbiCoder.encode(['string'], ['Hello, ']), 32)
    );
    expect(state[1]).to.equal(
      hexDataSlice(defaultAbiCoder.encode(['string'], ['world!']), 32)
    );
  });

  it('requires argument counts to match the function definition', () => {
    const planner = new Planner();
    expect(() => planner.add(Math.add(1))).to.throw();
  });

  it('plans a call to a function that takes and replaces the current state', () => {
    const TestContract = Contract.fromEthersContract(
      new ethers.Contract(SAMPLE_ADDRESS, [
        'function useState(bytes[] state) returns(bytes[])',
      ])
    );

    const planner = new Planner();
    planner.replaceState(TestContract.useState(planner.state));
    const { commands, state } = planner.plan();

    expect(commands.length).to.equal(1);
    expect(commands[0]).to.equal(
      '0x08f389c8fefffffffffffffeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
    );

    expect(state.length).to.equal(0);
  });

  describe('addSubplan()', () => {
    const SubplanContract = Contract.fromEthersContract(
      new ethers.Contract(SAMPLE_ADDRESS, [
        'function execute(bytes32[] commands, bytes[] state) returns(bytes[])',
      ])
    );

    const ReadonlySubplanContract = Contract.fromEthersContract(
      new ethers.Contract(SAMPLE_ADDRESS, [
        'function execute(bytes32[] commands, bytes[] state)',
      ])
    );

    it('supports subplans', () => {
      const subplanner = new Planner();
      subplanner.add(Math.add(1, 2));

      const planner = new Planner();
      planner.addSubplan(SubplanContract.execute(subplanner, subplanner.state));

      const { commands, state } = planner.plan();
      expect(commands).to.deep.equal([
        '0xde792d5f82fefffffffffffeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      ]);

      expect(state.length).to.equal(3);
      expect(state[0]).to.equal(defaultAbiCoder.encode(['uint'], [1]));
      expect(state[1]).to.equal(defaultAbiCoder.encode(['uint'], [2]));
      const subcommands = defaultAbiCoder.decode(
        ['bytes32[]'],
        hexConcat([
          '0x0000000000000000000000000000000000000000000000000000000000000020',
          state[2],
        ])
      )[0];
      expect(subcommands).to.deep.equal([
        '0x771602f70001ffffffffffffeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      ]);
    });

    it('allows return value access in the parent scope', () => {
      const subplanner = new Planner();
      const sum = subplanner.add(Math.add(1, 2));

      const planner = new Planner();
      planner.addSubplan(SubplanContract.execute(subplanner, subplanner.state));
      planner.add(Math.add(sum, 3));

      const { commands } = planner.plan();
      expect(commands).to.deep.equal([
        // Invoke subplanner
        '0xde792d5f83fefffffffffffeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        // sum + 3
        '0x771602f70102ffffffffffffeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      ]);
    });

    it('allows return value access across scopes', () => {
      const subplanner1 = new Planner();
      const sum = subplanner1.add(Math.add(1, 2));

      const subplanner2 = new Planner();
      subplanner2.add(Math.add(sum, 3));

      const planner = new Planner();
      planner.addSubplan(
        SubplanContract.execute(subplanner1, subplanner1.state)
      );
      planner.addSubplan(
        SubplanContract.execute(subplanner2, subplanner2.state)
      );

      const { commands, state } = planner.plan();
      expect(commands).to.deep.equal([
        // Invoke subplanner1
        '0xde792d5f83fefffffffffffeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        // Invoke subplanner2
        '0xde792d5f84fefffffffffffeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      ]);

      expect(state.length).to.equal(5);
      const subcommands2 = defaultAbiCoder.decode(
        ['bytes32[]'],
        hexConcat([
          '0x0000000000000000000000000000000000000000000000000000000000000020',
          state[4],
        ])
      )[0];
      expect(subcommands2).to.deep.equal([
        // sum + 3
        '0x771602f70102ffffffffffffeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      ]);
    });

    it("doesn't allow return values to be referenced before they are defined", () => {
      const subplanner = new Planner();
      const sum = subplanner.add(Math.add(1, 2));

      const planner = new Planner();
      planner.add(Math.add(sum, 3));

      expect(() => planner.plan()).to.throw(
        'Return value from "add" is not visible here'
      );
    });

    it('requires calls to addSubplan to have subplan and state args', () => {
      const subplanner = new Planner();
      subplanner.add(Math.add(1, 2));

      const planner = new Planner();
      expect(() =>
        planner.addSubplan(SubplanContract.execute(subplanner, []))
      ).to.throw('Subplans must take planner and state arguments');
      expect(() =>
        planner.addSubplan(SubplanContract.execute([], subplanner.state))
      ).to.throw('Subplans must take planner and state arguments');
    });

    it("doesn't allow more than one subplan per call", () => {
      const MultiSubplanContract = Contract.fromEthersContract(
        new ethers.Contract(SAMPLE_ADDRESS, [
          'function execute(bytes32[] commands, bytes32[] commands2, bytes[] state) returns(bytes[])',
        ])
      );

      const subplanner = new Planner();
      subplanner.add(Math.add(1, 2));

      const planner = new Planner();
      expect(() =>
        planner.addSubplan(
          MultiSubplanContract.execute(subplanner, subplanner, subplanner.state)
        )
      ).to.throw('Subplans can only take one planner argument');
    });

    it("doesn't allow more than one state array per call", () => {
      const MultiStateContract = Contract.fromEthersContract(
        new ethers.Contract(SAMPLE_ADDRESS, [
          'function execute(bytes32[] commands, bytes[] state, bytes[] state2) returns(bytes[])',
        ])
      );

      const subplanner = new Planner();
      subplanner.add(Math.add(1, 2));

      const planner = new Planner();
      expect(() =>
        planner.addSubplan(
          MultiStateContract.execute(
            subplanner,
            subplanner.state,
            subplanner.state
          )
        )
      ).to.throw('Subplans can only take one state argument');
    });

    it('requires subplan functions return bytes32[] or nothing', () => {
      const BadSubplanContract = Contract.fromEthersContract(
        new ethers.Contract(SAMPLE_ADDRESS, [
          'function execute(bytes32[] commands, bytes[] state) returns(uint)',
        ])
      );

      const subplanner = new Planner();
      subplanner.add(Math.add(1, 2));

      const planner = new Planner();
      expect(() =>
        planner.addSubplan(
          BadSubplanContract.execute(subplanner, subplanner.state)
        )
      ).to.throw('Subplans must return a bytes[] replacement state or nothing');
    });

    it('forbids infinite loops', () => {
      const planner = new Planner();
      planner.addSubplan(SubplanContract.execute(planner, planner.state));
      expect(() => planner.plan()).to.throw('A planner cannot contain itself');
    });

    it('allows for subplans without return values', () => {
      const subplanner = new Planner();
      subplanner.add(Math.add(1, 2));

      const planner = new Planner();
      planner.addSubplan(
        ReadonlySubplanContract.execute(subplanner, subplanner.state)
      );

      const { commands } = planner.plan();
      expect(commands).to.deep.equal([
        '0xde792d5f82feffffffffffffeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      ]);
    });

    it('does not allow return values from inside read-only subplans to be used outside them', () => {
      const subplanner = new Planner();
      const sum = subplanner.add(Math.add(1, 2));

      const planner = new Planner();
      planner.addSubplan(
        ReadonlySubplanContract.execute(subplanner, subplanner.state)
      );
      planner.add(Math.add(sum, 3));

      expect(() => planner.plan()).to.throw(
        'Return value from "add" is not visible here'
      );
    });
  });
});
