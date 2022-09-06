import { expect } from 'chai'
import { TransferCommand, V2ExactOutputCommand, V2ExactInputCommand, V3ExactInputCommand } from '../src/router_types'
import { RouterPlanner } from '../src/planner'

const SAMPLE_ADDRESS_D = '0xdddddddddddddddddddddddddddddddddddddddd'
const SAMPLE_ADDRESS_E = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
const SAMPLE_ADDRESS_F = '0xffffffffffffffffffffffffffffffffffffffff'

describe('RouterPlanner', () => {
  it('properly encodes TransferCommand', () => {
    const planner = new RouterPlanner()
    planner.add(new TransferCommand(SAMPLE_ADDRESS_E, SAMPLE_ADDRESS_D, SAMPLE_ADDRESS_F, 55))
    planner.add(new TransferCommand(SAMPLE_ADDRESS_F, SAMPLE_ADDRESS_E, SAMPLE_ADDRESS_D, 55))

    const { commands, state } = planner.plan()
    expect(commands.slice(2, 18)).to.equal('0100010203ffffff')
    expect(commands.slice(18, 36)).to.equal('0102000103ffffff')
    expect(state[0]).to.equal('0x000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee')
    expect(state[1]).to.equal('0x000000000000000000000000dddddddddddddddddddddddddddddddddddddddd')
    expect(state[2]).to.equal('0x000000000000000000000000ffffffffffffffffffffffffffffffffffffffff')
    expect(state[3]).to.equal('0x0000000000000000000000000000000000000000000000000000000000000037')
  })

  it('properly encodes V2ExactInputCommand', () => {
    const planner = new RouterPlanner()
    planner.add(new V2ExactInputCommand(1, [SAMPLE_ADDRESS_D, SAMPLE_ADDRESS_E], SAMPLE_ADDRESS_F))
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
    planner.add(new V2ExactOutputCommand(3, 100, [SAMPLE_ADDRESS_D, SAMPLE_ADDRESS_E], SAMPLE_ADDRESS_F))
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
    planner.add(new V3ExactInputCommand(SAMPLE_ADDRESS_D, false, 1234, 4321, '0x1234567890abcdef'))
    const { commands, state } = planner.plan()
    expect(commands.slice(2, 18)).to.equal('020001020384ffff')
    expect(state[0]).to.equal('0x000000000000000000000000dddddddddddddddddddddddddddddddddddddddd')
    expect(state[1]).to.equal('0x0000000000000000000000000000000000000000000000000000000000000000')
    expect(state[2]).to.equal('0x00000000000000000000000000000000000000000000000000000000000004d2')
    expect(state[3]).to.equal('0x00000000000000000000000000000000000000000000000000000000000010e1')
    expect(state[4]).to.equal('0x00000000000000000000000000000000000000000000000000000000000000081234567890abcdef000000000000000000000000000000000000000000000000')
  })
})
