// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {Test, stdJson, console2} from "forge-std/Test.sol";
import {ERC20} from "solmate/src/tokens/ERC20.sol";
import {ERC721} from "solmate/src/tokens/ERC721.sol";
import {UniversalRouter} from "universal-router/UniversalRouter.sol";
import {Permit2} from "permit2/src/Permit2.sol";
import {DeployRouter} from "./utils/DeployRouter.sol";
import {MethodParameters, Interop} from "./utils/Interop.sol";

contract SwapERC20CallParametersTest is Test, Interop, DeployRouter {
    using stdJson for string;

    address private constant RECIPIENT = 0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa;
    ERC20 private constant WETH = ERC20(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);
    ERC20 private constant USDC = ERC20(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
    ERC20 private constant DAI = ERC20(0x6B175474E89094C44Da98b954EedeAC495271d0F);
    // starting eth balance
    uint256 constant BALANCE = 10 ether;
    uint256 ONE_USDC = 10 ** 6;
    uint256 ONE_DAI = 1 ether;

    address from;
    uint256 fromPrivateKey;
    string json;
    Permit2 permit2;
    UniversalRouter router;

    function setUp() public {
        fromPrivateKey = 0x1234;
        from = vm.addr(fromPrivateKey);
        string memory root = vm.projectRoot();
        json = vm.readFile(string.concat(root, "/tests/forge/interop.json"));
    }

    function testMixedERC20ForLooksRareNFT() public {
        MethodParameters memory params = readFixture(json, "._ERC20_FOR_1_FOUNDATION_NFT");

        ERC721 nft = ERC721(0x5180db8F5c931aaE63c74266b211F580155ecac8);
        vm.createSelectFork(vm.envString("FORK_URL"), 15725945);
        vm.startPrank(from);

        (router, permit2) = deployFixtureMainnetConfig();
        console2.log(address(router));
        vm.deal(from, BALANCE);

        deal(address(USDC), from, BALANCE);
        USDC.approve(address(permit2), BALANCE);
        permit2.approve(address(USDC), address(router), uint160(BALANCE), uint48(block.timestamp + 1000));
        assertEq(USDC.balanceOf(from), BALANCE);
        uint256 startingRecipientBalance = RECIPIENT.balance;

        uint256 balanceOfBefore = USDC.balanceOf(from);
        console2.log(address(from).balance);
        (bool success,) = address(router).call{value: params.value}(params.data);
        require(success, "call failed");
        assertLe(USDC.balanceOf(from), balanceOfBefore);
        assertEq(nft.balanceOf(RECIPIENT), 1);
    }

    function testMixedERC20AndETHForLooksRareNFT() public {
        MethodParameters memory params = readFixture(json, "._ERC20_AND_ETH_FOR_1_FOUNDATION_NFT");

        ERC721 nft = ERC721(0x5180db8F5c931aaE63c74266b211F580155ecac8);
        vm.createSelectFork(vm.envString("FORK_URL"), 15725945);
        vm.startPrank(from);

        (router, permit2) = deployFixtureMainnetConfig();
        vm.deal(from, BALANCE);

        deal(address(USDC), from, BALANCE);
        USDC.approve(address(permit2), BALANCE);
        permit2.approve(address(USDC), address(router), uint160(BALANCE), uint48(block.timestamp + 1000));
        assertEq(USDC.balanceOf(from), BALANCE);
        uint256 startingRecipientBalance = RECIPIENT.balance;

        console2.log(address(from).balance);
        uint256 balanceOfBefore = USDC.balanceOf(from);
        (bool success,) = address(router).call{value: params.value}(params.data);
        require(success, "call failed");
        assertLe(USDC.balanceOf(from), balanceOfBefore);
        assertEq(nft.balanceOf(RECIPIENT), 1);
    }
}
