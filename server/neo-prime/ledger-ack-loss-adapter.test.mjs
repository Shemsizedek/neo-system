import test from 'node:test'
import assert from 'node:assert/strict'
import { createLedgerContractMock } from './ledger-contract-mock.mjs'
import { createAckLossAdapter } from './ledger-ack-loss-adapter.mjs'

test('lost reservation acknowledgment must not double reserve on retry', () => {
  const ledger = createLedgerContractMock({ capMicrousd: 100 })
  const adapter = createAckLossAdapter(ledger, { loseFirstAckFor: ['reserve'] })
  assert.equal(adapter.reserve('same-key', 80).reason, 'acknowledgment_lost')
  assert.equal(adapter.snapshot().reservedMicrousd, 80)
  assert.equal(adapter.reserve('same-key', 80).reason, 'duplicate')
  assert.equal(adapter.snapshot().reservedMicrousd, 80)
})

test('lost settlement acknowledgment does not double settle', () => {
  const ledger = createLedgerContractMock({ capMicrousd: 100 })
  ledger.reserve('attempt', 80)
  ledger.start('attempt')
  const adapter = createAckLossAdapter(ledger, { loseFirstAckFor: ['finalize'] })
  assert.equal(adapter.finalize('attempt', 30).reason, 'acknowledgment_lost')
  assert.equal(adapter.snapshot().settledMicrousd, 30)
  assert.equal(adapter.finalize('attempt', 30).reason, 'invalid_transition')
  assert.equal(adapter.snapshot().settledMicrousd, 30)
})

test('lost unknown-transition acknowledgment still holds reservation', () => {
  const ledger = createLedgerContractMock({ capMicrousd: 100 })
  ledger.reserve('attempt', 90)
  ledger.start('attempt')
  const adapter = createAckLossAdapter(ledger, { loseFirstAckFor: ['unknown'] })
  assert.equal(adapter.unknown('attempt').reason, 'acknowledgment_lost')
  assert.equal(adapter.snapshot().reservedMicrousd, 90)
  assert.equal(adapter.snapshot().entries[0].state, 'unknown')
  assert.equal(adapter.reserve('another', 20).reason, 'exhausted')
})
