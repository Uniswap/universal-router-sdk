// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";
import {Router} from "narwhal/Router.sol";
import {Permit2} from "permit2/src/Permit2.sol";
import {ERC20} from 'solmate/tokens/ERC20.sol';
import 'permit2/src/interfaces/IAllowanceTransfer.sol';


contract DeployRouter is Test {
    address public constant PERMIT2 = 0x6fEe9BeC3B3fc8f9DA5740f0efc6BbE6966cd6A6;
    address public constant LOOKS_TOKEN = 0xf4d2888d29D722226FafA5d9B24F9164c092421E;
    address public constant LOOKS_DISTRIBUTOR = 0x0554f068365eD43dcC98dcd7Fd7A8208a5638C72;
    address public constant V2_FACTORY = 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f;
    address public constant V3_FACTORY = 0x1F98431c8aD98523631AE4a59f267346ea31F984;
    bytes32 public constant PAIR_INIT_CODE_HASH = 0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f;
    bytes32 public constant POOL_INIT_CODE_HASH = 0xe34f199b19b2b4f47f68442619d555527d244f78a3297ea89325f843f87b8b54;

    function deployRouterMainnetConfig() public returns (Router router) {
        return new Router(
            IAllowanceTransfer(PERMIT2),
            address(0), // TODO: update with routerRewardsDistributor
            LOOKS_DISTRIBUTOR, // TODO: update with looksRareRewardsDistributor
            ERC20(LOOKS_TOKEN),
            address(V2_FACTORY),
            address(V3_FACTORY),
            PAIR_INIT_CODE_HASH,
            POOL_INIT_CODE_HASH
        );
    }

}
