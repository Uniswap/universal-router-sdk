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
Weiroll programs consist of a sequence of calls to functions in external contracts. These calls can either be delegate calls to dedicated library contracts, or standard/static calls to external contracts. Before you can start creating a weiroll program, you will need to create interfaces for at least one contract you intend to use.

The easiest way to do this is by wrapping ethers.js contract instances:

```javascript
const ethersContract = new ethers.Contract(address, abi);
const contract = weiroll.Contract.createLibrary(ethersContract);
```

This will produce a contract object that generates delegate calls to the contract in `ethersContract`.

To create regular or static calls to an external contract, use `createContract`:

```javascript
const ethersContract = new ethers.Contract(address, abi);
// Makes calls using CALL
const contract = weiroll.Contract.createContract(ethersContract);
// Makes calls using STATICCALL
const contract = weiroll.Contract.createContract(ethersContract, CommandFlags.STATICCALL);
```

You can repeat this for each contract you wish to use. A weiroll `Contract` object can be reused across as many planner instances as you wish; there is no need to construct them again for each new program.

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

For calls to external contracts, you can also pass a value in ether to send:

```javascript
planner.add(contract.func(a, b).withValue(c));
```

`withValue` takes the same argument types as contract functions, so you can pass the return value of another function, or a literal value. You cannot combine `withValue` with delegate calls (eg, calls to a library created with `Contract.newLibrary`) or static calls.

Likewise, if you want to make a particular call static, you can use `.staticcall()`:

```javascript
const result = planner.add(contract.func(a, b).staticcall());
```

Weiroll only supports functions that return a single value by default. If your function returns multiple values, though, you can instruct weiroll to wrap it in a `bytes`, which subsequent commands can decode and work with:

```javascript
const ret = planner.add(contract.func(a, b).rawValue());
```

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
