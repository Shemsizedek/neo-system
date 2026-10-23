import test from 'node:test'
import assert from 'node:assert/strict'
import { createLedgerContractMock } from './ledger-contract-mock.mjs'
import { createFaultInjectingLedgerAdapter } from './ledger-fault-adapter.mjs'

test('failed reservation does not consume budget or allow an authorized provider attempt', () => {
  const ledger = createLedgerContractMock({ capMicrousd: 100 })
  const adapter = createFaultInjectingLedgerAdapter(ledger, { failAt: ['reserve'] })
  assert.deepEqual(adapter.reserve('request', 80), { ok: false, reason: 'injected_storage_failure' })
  assert.equal(adapter.snapshot().reservedMicrousd, 0)
})

test('failed settlement retains full reservation for investigation', () => {
  const ledger = createLedgerContractMock({ capMicrousd: 100 })
  const adapter = createFaultInjectingLedgerAdapter(ledger, { failAt: ['finalize'] })
  assert.equal(adapter.reserve('request', 80).ok, true)
  assert.equal(adapter.start('request').ok, true)
  assert.equal(adapter.finalize('request', 30).ok, false)
  assert.equal(adapter.snapshot().reservedMicrousd, 80)
  assert.equal(adapter.snapshot().settledMicrousd, 0)
})

test('failed unknown transition cannot release or settle funds', () => {
  const ledger = createLedgerContractMock({ capMicrousd: 100 })
  const adapter = createFaultInjectingLedgerAdapter(ledger, { failAt: ['unknown'] })
  adapter.reserve('request', 80)
  adapter.start('request')
  assert.equal(adapter.unknown('request').ok, false)
  assert.equal(adapter.snapshot().reservedMicrousd, 80)
})

test('retry after a simulated reservation response failure is deduplicated', () => {
  const ledger = createLedgerContractMock({ capMicrousd: 100 })
  assert.equal(ledger.reserve('same', 80).ok, true)
  const adapter = createFaultInjectingLedgerAdapter(ledger)
  assert.equal(adapter.reserve('same', 80).reason, 'duplicate')
  assert.equal(adapter.snapshot().reservedMicrousd, 80)
})
