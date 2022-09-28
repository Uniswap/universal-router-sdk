describe('RouterCommand', () => {
  it('enables allowRevert() for transactions that can revert', () => {
    const command = SeaportCommand(666, '0x1234567890abcdef')
    expect(command.getFlags()).to.eq(CommandFlags.SEAPORT)

    command.allowRevert()
    expect(command.getFlags()).to.eq(CommandFlags.SEAPORT + CommandFlags.ALLOW_REVERT)
  })

  it('reverts for transactions that cannot allow reverts', () => {
    const command = TransferCommand(SAMPLE_ADDRESS_F, SAMPLE_ADDRESS_D, 55)
    expect(function () { command.allowRevert() }).to.throw('command type: TRANSFER cannot be allowed to revert')
  })
})
