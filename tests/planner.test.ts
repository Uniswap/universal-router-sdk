import { expect } from 'chai'
import {
  NFTXCommand,
  SeaportCommand,
  TransferCommand,
  V2ExactOutputCommand,
  V2ExactInputCommand,
  V3ExactInputCommand,
  WrapETHCommand,
  UnwrapWETHCommand,
  UnwrapWETHWithFeeCommand,
  SweepWithFeeCommand,
  SweepCommand,
  LooksRareCommand721,
  X2Y2Command721,
  LooksRareCommand1155,
  X2Y2Command1155,
  PermitCommand,
  FoundationCommand,
  SudoswapCommand,
} from '../src/routerCommands'
import { RouterPlanner } from '../src/planner'

const SAMPLE_ADDRESS_D = '0xdddddddddddddddddddddddddddddddddddddddd'
const SAMPLE_ADDRESS_E = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
const SAMPLE_ADDRESS_F = '0xffffffffffffffffffffffffffffffffffffffff'

describe('RouterPlanner', () => {
  it('properly encodes TransferCommand', () => {
    const planner = new RouterPlanner()
    planner.add(TransferCommand(SAMPLE_ADDRESS_E, SAMPLE_ADDRESS_F, 55))
    planner.add(TransferCommand(SAMPLE_ADDRESS_F, SAMPLE_ADDRESS_D, 55))

    const { commands, state } = planner.plan()
    expect(commands.slice(2, 18)).to.equal('01000102ffffffff')
    expect(commands.slice(18, 36)).to.equal('01010302ffffffff')
    expect(state[0]).to.equal('0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee')
    expect(state[1]).to.equal('0x000000000000000000000000ffffffffffffffffffffffffffffffffffffffff')
    expect(state[2]).to.equal('0x0000000000000000000000000000000000000000000000000000000000000037')
    expect(state[3]).to.equal('0x000000000000000000000000dddddddddddddddddddddddddddddddddddddddd')
  })

  it('properly encodes V2ExactInputCommand', () => {
    const planner = new RouterPlanner()
    planner.add(V2ExactInputCommand(1, [SAMPLE_ADDRESS_D, SAMPLE_ADDRESS_E], SAMPLE_ADDRESS_F))
    const { commands, state } = planner.plan()
    expect(commands.slice(2, 18)).to.equal('04008102ffffffff')
    expect(state[0]).to.equal('0x0000000000000000000000000000000000000000000000000000000000000001')
    expect(state[1]).to.equal(
      '0x0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000dddddddddddddddddddddddddddddddddddddddd000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
    )
    expect(state[2]).to.equal('0x000000000000000000000000ffffffffffffffffffffffffffffffffffffffff')
  })

  it('properly encodes V2ExactOutputCommand', () => {
    const planner = new RouterPlanner()
    planner.add(V2ExactOutputCommand(3, 100, [SAMPLE_ADDRESS_D, SAMPLE_ADDRESS_E], SAMPLE_ADDRESS_F))
    const { commands, state } = planner.plan()
    expect(commands.slice(2, 18)).to.equal('0500018203ffffff')
    expect(state[0]).to.equal('0x0000000000000000000000000000000000000000000000000000000000000003')
    expect(state[1]).to.equal('0x0000000000000000000000000000000000000000000000000000000000000064')
    expect(state[2]).to.equal(
      '0x0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000dddddddddddddddddddddddddddddddddddddddd000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
    )
    expect(state[3]).to.equal('0x000000000000000000000000ffffffffffffffffffffffffffffffffffffffff')
  })

  it('properly encodes V3ExactInputCommand', () => {
    const planner = new RouterPlanner()
    planner.add(V3ExactInputCommand(SAMPLE_ADDRESS_D, 1234, 4321, '0x1234567890abcdef'))
    const { commands, state } = planner.plan()
    expect(commands.slice(2, 18)).to.equal('0200010283ffffff')
    expect(state[0]).to.equal('0x000000000000000000000000dddddddddddddddddddddddddddddddddddddddd')
    expect(state[1]).to.equal('0x00000000000000000000000000000000000000000000000000000000000004d2')
    expect(state[2]).to.equal('0x00000000000000000000000000000000000000000000000000000000000010e1')
    expect(state[3]).to.equal(
      '0x00000000000000000000000000000000000000000000000000000000000000081234567890abcdef000000000000000000000000000000000000000000000000'
    )
  })

  it('properly encodes SeaportCommand', () => {
    const planner = new RouterPlanner()
    planner.add(SeaportCommand(666, '0x1234567890abcdef'))
    const { commands, state } = planner.plan()
    expect(commands.slice(2, 18)).to.equal('060081ffffffffff')
    expect(state[0]).to.equal('0x000000000000000000000000000000000000000000000000000000000000029a')
    expect(state[1]).to.equal(
      '0x00000000000000000000000000000000000000000000000000000000000000081234567890abcdef000000000000000000000000000000000000000000000000'
    )
  })

  it('properly encodes LooksRareCommand721', () => {
    const planner = new RouterPlanner()
    planner.add(LooksRareCommand721(666, '0x1234567890abcdef', SAMPLE_ADDRESS_D, SAMPLE_ADDRESS_E, 1016))
    const { commands, state } = planner.plan()
    expect(commands.slice(2, 18)).to.equal('0b0081020304ffff')
    expect(state[0]).to.equal('0x000000000000000000000000000000000000000000000000000000000000029a')
    expect(state[1]).to.equal(
      '0x00000000000000000000000000000000000000000000000000000000000000081234567890abcdef000000000000000000000000000000000000000000000000'
    )
    expect(state[2]).to.equal('0x000000000000000000000000dddddddddddddddddddddddddddddddddddddddd')
    expect(state[3]).to.equal('0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee')
    expect(state[4]).to.equal('0x00000000000000000000000000000000000000000000000000000000000003f8')
  })

  it('properly encodes LooksRareCommand1155', () => {
    const planner = new RouterPlanner()
    planner.add(LooksRareCommand1155(666, '0x1234567890abcdef', SAMPLE_ADDRESS_D, SAMPLE_ADDRESS_E, 1016))
    const { commands, state } = planner.plan()
    expect(commands.slice(2, 18)).to.equal('0d0081020304ffff')
    expect(state[0]).to.equal('0x000000000000000000000000000000000000000000000000000000000000029a')
    expect(state[1]).to.equal(
      '0x00000000000000000000000000000000000000000000000000000000000000081234567890abcdef000000000000000000000000000000000000000000000000'
    )
    expect(state[2]).to.equal('0x000000000000000000000000dddddddddddddddddddddddddddddddddddddddd')
    expect(state[3]).to.equal('0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee')
    expect(state[4]).to.equal('0x00000000000000000000000000000000000000000000000000000000000003f8')
  })

  it('properly encodes X2Y2Command721', () => {
    const planner = new RouterPlanner()
    planner.add(X2Y2Command721(666, '0x1234567890abcdef', SAMPLE_ADDRESS_D, SAMPLE_ADDRESS_E, 1016))
    const { commands, state } = planner.plan()
    expect(commands.slice(2, 18)).to.equal('0c0081020304ffff')
    expect(state[0]).to.equal('0x000000000000000000000000000000000000000000000000000000000000029a')
    expect(state[1]).to.equal(
      '0x00000000000000000000000000000000000000000000000000000000000000081234567890abcdef000000000000000000000000000000000000000000000000'
    )
    expect(state[2]).to.equal('0x000000000000000000000000dddddddddddddddddddddddddddddddddddddddd')
    expect(state[3]).to.equal('0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee')
    expect(state[4]).to.equal('0x00000000000000000000000000000000000000000000000000000000000003f8')
  })

  it('properly encodes PermitCommand', () => {
    let planner = new RouterPlanner()
    planner.add(PermitCommand('0x1234567890abcdef'))
    let { commands, state } = planner.plan()
    expect(commands.slice(2, 18)).to.equal('0080ffffffffffff')
    expect(state[0]).to.equal(
      '0x00000000000000000000000000000000000000000000000000000000000000081234567890abcdef000000000000000000000000000000000000000000000000'
    )

    planner = new RouterPlanner()
    planner.add(
      PermitCommand(
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      )
    )
    ;({ commands, state } = planner.plan())
    expect(commands.slice(2, 18)).to.equal('0080ffffffffffff')
    expect(state[0]).to.equal(
      '0x00000000000000000000000000000000000000000000000000000000000000501234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef00000000000000000000000000000000'
    )
  })

  it('properly encodes X2Y2Command1155', () => {
    const planner = new RouterPlanner()
    planner.add(X2Y2Command1155(666, '0x1234567890abcdef', SAMPLE_ADDRESS_D, SAMPLE_ADDRESS_E, 1016))
    const { commands, state } = planner.plan()
    expect(commands.slice(2, 18)).to.equal('0e0081020304ffff')
    expect(state[0]).to.equal('0x000000000000000000000000000000000000000000000000000000000000029a')
    expect(state[1]).to.equal(
      '0x00000000000000000000000000000000000000000000000000000000000000081234567890abcdef000000000000000000000000000000000000000000000000'
    )
    expect(state[2]).to.equal('0x000000000000000000000000dddddddddddddddddddddddddddddddddddddddd')
    expect(state[3]).to.equal('0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee')
    expect(state[4]).to.equal('0x00000000000000000000000000000000000000000000000000000000000003f8')
  })

  it('properly encodes NFTXCommand', () => {
    const planner = new RouterPlanner()
    planner.add(NFTXCommand(666, '0x1234567890abcdef'))
    const { commands, state } = planner.plan()
    expect(commands.slice(2, 18)).to.equal('0a0081ffffffffff')
    expect(state[0]).to.equal('0x000000000000000000000000000000000000000000000000000000000000029a')
    expect(state[1]).to.equal(
      '0x00000000000000000000000000000000000000000000000000000000000000081234567890abcdef000000000000000000000000000000000000000000000000'
    )
  })

  it('properly encodes WrapETHCommand', () => {
    const planner = new RouterPlanner()
    planner.add(WrapETHCommand(SAMPLE_ADDRESS_D, 10))
    const { commands, state } = planner.plan()
    expect(commands.slice(2, 18)).to.equal('070001ffffffffff')
    expect(state[0]).to.equal('0x000000000000000000000000dddddddddddddddddddddddddddddddddddddddd')
    expect(state[1]).to.equal('0x000000000000000000000000000000000000000000000000000000000000000a')
  })

  it('properly encodes UnwrapWETHCommand', () => {
    const planner = new RouterPlanner()
    planner.add(UnwrapWETHCommand(SAMPLE_ADDRESS_E, 10))
    const { commands, state } = planner.plan()
    expect(commands.slice(2, 18)).to.equal('080001ffffffffff')
    expect(state[0]).to.equal('0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee')
    expect(state[1]).to.equal('0x000000000000000000000000000000000000000000000000000000000000000a')
  })

  it('properly encodes UnwrapWETHWithFeeCommand', () => {
    const planner = new RouterPlanner()
    planner.add(UnwrapWETHWithFeeCommand(SAMPLE_ADDRESS_E, 10, 100, SAMPLE_ADDRESS_F))
    const { commands, state } = planner.plan()
    expect(commands.slice(2, 18)).to.equal('1100010203ffffff')
    expect(state[0]).to.equal('0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee')
    expect(state[1]).to.equal('0x000000000000000000000000000000000000000000000000000000000000000a')
    expect(state[2]).to.equal('0x0000000000000000000000000000000000000000000000000000000000000064')
    expect(state[3]).to.equal('0x000000000000000000000000ffffffffffffffffffffffffffffffffffffffff')
  })

  it('properly encodes SweepCommand', () => {
    const planner = new RouterPlanner()
    planner.add(SweepCommand(SAMPLE_ADDRESS_E, SAMPLE_ADDRESS_F, 123))
    const { commands, state } = planner.plan()
    expect(commands.slice(2, 18)).to.equal('09000102ffffffff')
    expect(state[0]).to.equal('0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee')
    expect(state[1]).to.equal('0x000000000000000000000000ffffffffffffffffffffffffffffffffffffffff')
    expect(state[2]).to.equal('0x000000000000000000000000000000000000000000000000000000000000007b')
  })

  it('properly encodes SweepWithFeeCommand', () => {
    const planner = new RouterPlanner()
    planner.add(SweepWithFeeCommand(SAMPLE_ADDRESS_E, SAMPLE_ADDRESS_F, 123, 99, SAMPLE_ADDRESS_D))
    const { commands, state } = planner.plan()
    expect(commands.slice(2, 18)).to.equal('100001020304ffff')
    expect(state[0]).to.equal('0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee')
    expect(state[1]).to.equal('0x000000000000000000000000ffffffffffffffffffffffffffffffffffffffff')
    expect(state[2]).to.equal('0x000000000000000000000000000000000000000000000000000000000000007b')
    expect(state[3]).to.equal('0x0000000000000000000000000000000000000000000000000000000000000063')
    expect(state[4]).to.equal('0x000000000000000000000000dddddddddddddddddddddddddddddddddddddddd')
  })

  it ('properly encodes FoundationCommand', () => {
    const planner = new RouterPlanner()
    planner.add(FoundationCommand(666, '0x1234567890abcdef', SAMPLE_ADDRESS_D, SAMPLE_ADDRESS_E, 1016))
    const { commands, state } = planner.plan()
    expect(commands.slice(2, 18)).to.equal('0f0081020304ffff')
    expect(state[0]).to.equal('0x000000000000000000000000000000000000000000000000000000000000029a')
    expect(state[1]).to.equal(
        '0x00000000000000000000000000000000000000000000000000000000000000081234567890abcdef000000000000000000000000000000000000000000000000'
    )
    expect(state[2]).to.equal('0x000000000000000000000000dddddddddddddddddddddddddddddddddddddddd')
    expect(state[3]).to.equal('0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee')
    expect(state[4]).to.equal('0x00000000000000000000000000000000000000000000000000000000000003f8')
  })

  it('properly encodes SudoswapCommand', () => {
    const planner = new RouterPlanner()
    planner.add(SudoswapCommand(666, '0x1234567890abcdef'))
    const { commands, state } = planner.plan()
    expect(commands.slice(2, 18)).to.equal('120081ffffffffff')
    expect(state[0]).to.equal('0x000000000000000000000000000000000000000000000000000000000000029a')
    expect(state[1]).to.equal(
        '0x00000000000000000000000000000000000000000000000000000000000000081234567890abcdef000000000000000000000000000000000000000000000000'
    )
  })
})
