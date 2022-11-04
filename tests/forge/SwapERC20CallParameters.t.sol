// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {Test, stdJson, console2} from "forge-std/Test.sol";
import {ERC20} from "solmate/tokens/ERC20.sol";
import {Router} from "narwhal/Router.sol";
import {Permit2} from "permit2/src/Permit2.sol";
import {DeployRouter} from "./utils/DeployRouter.sol";
import {MethodParameters, Interop} from "./utils/Interop.sol";

contract SwapERC20CallParametersTest is Test, Interop, DeployRouter {
    using stdJson for string;

    address private constant RECIPIENT = 0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa;
    ERC20 private constant WETH = ERC20(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);
    ERC20 private constant USDC = ERC20(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
    ERC20 private constant DAI = ERC20(0x6B175474E89094C44Da98b954EedeAC495271d0F);

    address from;
    uint256 fromPrivateKey;
    string json;

    function setUp() public {
        fromPrivateKey = 0x1234;
        from = vm.addr(fromPrivateKey);
        string memory root = vm.projectRoot();
        json = vm.readFile(string.concat(root, "/tests/forge/interop.json"));
    }

    function testV2ExactInputSingleNative() public {
        MethodParameters memory params = readFixture(json, "._UNISWAP_V2_EXACT_INPUT_SINGLE_NATIVE");

        (Router router,) = forkAndDeploy(15898000);
        uint256 balance = 10 ether;
        vm.deal(from, balance);
        assertEq(from.balance, balance);
        assertEq(USDC.balanceOf(RECIPIENT), 0);

        (bool success,) = address(router).call{value: params.value}(params.data);
        require(success, "call failed");
        assertLe(from.balance, balance - params.value);
        assertGt(USDC.balanceOf(RECIPIENT), 10000000);
    }

    function testV2ExactInputNative() public {
        MethodParameters memory params = readFixture(json, "._UNISWAP_V2_EXACT_INPUT_NATIVE");

        (Router router,) = forkAndDeploy(15898000);
        uint256 balance = 10 ether;
        vm.deal(from, balance);
        assertEq(from.balance, balance);
        assertEq(DAI.balanceOf(RECIPIENT), 0);

        (bool success,) = address(router).call{value: params.value}(params.data);
        require(success, "call failed");
        assertLe(from.balance, balance - params.value);
        assertGt(DAI.balanceOf(RECIPIENT), 10000000);
    }

    function testV2ExactInputSingleERC20() public {
        MethodParameters memory params = readFixture(json, "._UNISWAP_V2_EXACT_INPUT_SINGLE_ERC20");

        (Router router, Permit2 permit2) = forkAndDeploy(15898000);

        uint256 balance = 10 ether;
        vm.deal(from, balance);
        deal(address(USDC), from, balance);
        USDC.approve(address(permit2), balance);
        permit2.approve(address(USDC), address(router), uint160(balance), uint64(block.timestamp + 1000));

        assertEq(USDC.balanceOf(from), balance);
        uint256 startingRecipientBalance = RECIPIENT.balance;

        (bool success,) = address(router).call{value: params.value}(params.data);
        require(success, "call failed");
        assertLe(USDC.balanceOf(from), balance - 1000000000);
        assertGe(RECIPIENT.balance, startingRecipientBalance + 10000000);
    }

    function testV2ExactInputERC20() public {
        MethodParameters memory params = readFixture(json, "._UNISWAP_V2_EXACT_INPUT_ERC20");

        (Router router, Permit2 permit2) = forkAndDeploy(15898000);
        uint256 balance = 10 ether;
        vm.deal(from, balance);
        deal(address(DAI), from, balance);
        DAI.approve(address(permit2), balance);
        permit2.approve(address(DAI), address(router), uint160(balance), uint64(block.timestamp + 1000));
        assertEq(DAI.balanceOf(from), balance);
        uint256 startingRecipientBalance = RECIPIENT.balance;

        (bool success,) = address(router).call{value: params.value}(params.data);
        require(success, "call failed");
        assertLe(DAI.balanceOf(from), balance - 10 ether);
        assertGe(RECIPIENT.balance, startingRecipientBalance + 10000000);
    }

    function testV2ExactOutputSingleNative() public {
        MethodParameters memory params = readFixture(json, "._UNISWAP_V2_EXACT_OUTPUT_SINGLE_NATIVE");

        (Router router,) = forkAndDeploy(15898000);
        uint256 balance = 10 ether;
        vm.deal(from, balance);
        assertEq(from.balance, balance);
        assertEq(USDC.balanceOf(RECIPIENT), 0);

        (bool success,) = address(router).call{value: params.value}(params.data);
        require(success, "call failed");
        assertLe(from.balance, balance - params.value);
        assertEq(USDC.balanceOf(RECIPIENT), 1000000000);
    }

    function testV2ExactOutputSingleERC20() public {
        MethodParameters memory params = readFixture(json, "._UNISWAP_V2_EXACT_OUTPUT_SINGLE_ERC20");

        (Router router, Permit2 permit2) = forkAndDeploy(15898000);

        uint256 balance = 10 ether;
        vm.deal(from, balance);
        deal(address(USDC), from, balance);
        USDC.approve(address(permit2), balance);
        permit2.approve(address(USDC), address(router), uint160(balance), uint64(block.timestamp + 1000));

        assertEq(USDC.balanceOf(from), balance);
        uint256 startingRecipientBalance = RECIPIENT.balance;

        (bool success,) = address(router).call{value: params.value}(params.data);
        require(success, "call failed");
        assertLe(USDC.balanceOf(from), balance - 1000000);
        assertGe(RECIPIENT.balance, startingRecipientBalance + 1 ether);
    }

    // hangs for some reason
    function xtestV3ExactInputSingleNative() public {
        MethodParameters memory params = readFixture(json, "._UNISWAP_V3_EXACT_INPUT_SINGLE_NATIVE");

        (Router router,) = forkAndDeploy();

        uint256 balance = 10 ether;
        vm.deal(from, balance);
        assertEq(from.balance, balance);
        assertEq(USDC.balanceOf(RECIPIENT), 0);

        (bool success,) = address(router).call{value: params.value}(params.data);
        require(success, "call failed");
        assertLe(from.balance, balance - params.value);
        assertGt(USDC.balanceOf(RECIPIENT), 10000000);
    }

    function forkAndDeploy() private returns (Router router, Permit2 permit2) {
        vm.createSelectFork(vm.envString("FORK_URL"));
        vm.startPrank(from);
        (router, permit2) = deployFixtureMainnetConfig();
    }

    function forkAndDeploy(uint256 forkBlock) private returns (Router router, Permit2 permit2) {
        vm.createSelectFork(vm.envString("FORK_URL"), forkBlock);
        vm.startPrank(from);
        (router, permit2) = deployFixtureMainnetConfig();
    }
}
