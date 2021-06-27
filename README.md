# weiroll.js

[![CI](https://github.com/weiroll/weiroll.js/actions/workflows/main.yml/badge.svg)](https://github.com/weiroll/weiroll.js/actions/workflows/main.yml)[![size](https://github.com/weiroll/weiroll.js/actions/workflows/size.yml/badge.svg)](https://github.com/weiroll/weiroll.js/actions/workflows/size.yml)

weiroll.js is a planner for the operation-chaining/scripting language [weiroll](https://github.com/weiroll/weiroll).

It provides an easy-to-use API for generating weiroll programs that can then be passed to any compatible implementation.

## Installation

```
npm install --save @weiroll/weiroll.js
```

## Usage

### Wrapping contracts

Weiroll programs consist of a sequence of delegatecalls to library functions in external contracts. Before you can start creating a weiroll program, you will need to create interfaces for at least one library contract you intend to use.

The easiest way to do this is by wrapping ethers.js contract instances:

```javascript
const ethersContract = new ethers.Contract(address, abi);
const contract = weiroll.Contract.fromEthersContract(ethersContract);
```

You can repeat this for each library contract you wish to use. A weiroll `Contract` object can be reused across as many planner instances as you wish; there is no need to construct them again for each new program.

### Planning programs

First, instantiate a planner:

```javascript
const planner = new weiroll.Planner();
```

Next, add one or more commands to execute:

```javascript
const ret = planner.add(contract.func(a, b));
```

Return values from one invocation can be used in another one:

```javascript
planner.add(contract.func2(ret));
```

Remember to wrap each call to a contract in `planner.add`. Attempting to pass the result of one contract function directly to another will not work - each one needs to be added to the planner!

Once you are done planning operations, generate the program:

```javascript
const { commands, state } = planner.plan();
```

### Subplans
In some cases it may be useful to be able to instantiate nested instances of the weiroll VM - for example, when using flash loans, or other systems that function by making a callback to your code. The weiroll planner supports this via 'subplans'.

To make a subplan, construct the operations that should take place inside the nested instance normally, then pass the planner object to a contract function that executes the subplan, and pass that to the outer planner's `.addSubplan()` function instead of `.add()`.

For example, suppose you want to call a nested instance to do some math:

```javascript
const subplanner = new Planner();
const sum = subplanner.add(Math.add(1, 2));

const planner = new Planner();
planner.addSubplan(Weiroll.execute(subplanner, subplanner.state));
planner.add(Events.logUint(sum));

const {commands, state} = planner.plan();
```

Subplan functions must specify which argument receives the current state using the special variable `Planner.state`, and must take exactly one subplanner and one state argument. Subplan functions must either return an updated state or nothing.

If a subplan returns updated state, return values created in a subplanner, such as `sum` above, can be referenced in the outer scope, and even in other subplans, as long as they are referenced after the command that produces them. Subplans that do not return updated state are read-only, and return values defined inside them cannot be referenced outside them.
