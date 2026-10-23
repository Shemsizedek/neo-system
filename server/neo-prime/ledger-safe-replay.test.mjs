import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateReplay } from './ledger-safe-replay.mjs'
import { createLedgerContractMock } from './ledger-contract-mock.mjs'
import { createAckLossAdapter } from './ledger-ack-loss-adapter.mjs'

test('all replay decisions fail closed to paid provider invocation', () => {
  const cases = [
    {}, { lookupFailed: true }, { attempt: { state: 'reserved' } },
    { attempt: { state: 'started' } }, { attempt: { state: 'unknown' } },
    { attempt: { state: 'settled' } }, { attempt: { state: 'reconciled' } },
    { attempt: { state: 'unexpected' } },
  ]
  for (const input of cases) assert.equal(evaluateReplay(input).invokeProvider, false)
})

test('missing record requires a fresh reservation, not direct invocation', () => {
  assert.equal(evaluateReplay().action, 'new_reservation_required')
  assert.equal(evaluateReplay({ lookupFailed: true }).action, 'deny')
})

test('ambiguous attempts require inspection or reconciliation', () => {
  assert.equal(evaluateReplay({ attempt: { state: 'reserved' } }).action, 'inspect')
  assert.equal(evaluateReplay({ attempt: { state: 'started' } }).action, 'inspect')
  assert.equal(evaluateReplay({ attempt: { state: 'unknown' } }).action, 'reconcile')
})

test('terminal attempts return existing result without new provider call', () => {
  for (const state of ['settled', 'reconciled']) {
    assert.equal(evaluateReplay({ attempt: { state } }).action, 'return_existing_result')
  }
})

test('lost reservation acknowledgment does not permit a second provider attempt', () => {
  const ledger = createLedgerContractMock({ capMicrousd: 100 })
  const adapter = createAckLossAdapter(ledger, { loseFirstAckFor: ['reserve'] })
  assert.equal(adapter.reserve('key', 70).reason, 'acknowledgment_lost')
  const attempt = adapter.snapshot().entries.find(x => x.key === 'key')
  assert.equal(evaluateReplay({ attempt }).invokeProvider, false)
  assert.equal(adapter.reserve('key', 70).reason, 'duplicate')
  assert.equal(adapter.snapshot().reservedMicrousd, 70)
})
