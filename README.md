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
