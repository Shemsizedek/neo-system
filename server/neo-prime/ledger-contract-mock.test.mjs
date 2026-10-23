import test from 'node:test'
import assert from 'node:assert/strict'
import { createLedgerContractMock } from './ledger-contract-mock.mjs'

test('two simultaneous workers cannot oversubscribe a budget', async () => {
  const ledger = createLedgerContractMock({ capMicrousd: 100 })
  const results = await Promise.all(Array.from({ length: 10 }, (_, i) =>
    Promise.resolve().then(() => ledger.reserve('attempt-' + i, 30))))
  assert.equal(results.filter(result => result.ok).length, 3)
  assert.equal(ledger.snapshot().availableMicrousd, 10)
})

test('replayed attempt key never debits twice', () => {
  const ledger = createLedgerContractMock({ capMicrousd: 100 })
  assert.equal(ledger.reserve('same', 60).ok, true)
  assert.equal(ledger.reserve('same', 60).reason, 'duplicate')
  assert.equal(ledger.snapshot().reservedMicrousd, 60)
})

test('uncertain provider attempt remains reserved through failure and recovery', () => {
  const ledger = createLedgerContractMock({ capMicrousd: 100 })
  ledger.reserve('timeout', 80)
  ledger.start('timeout')
  ledger.unknown('timeout')
  assert.equal(ledger.snapshot().reservedMicrousd, 80)
  assert.equal(ledger.reserve('another', 30).reason, 'exhausted')
  assert.equal(ledger.finalize('timeout', 25, { reconciled: true }).ok, true)
  assert.equal(ledger.snapshot().availableMicrousd, 75)
})

test('settlement and reconciliation are idempotent transitions', () => {
  const ledger = createLedgerContractMock({ capMicrousd: 100 })
  ledger.reserve('once', 80)
  ledger.start('once')
  assert.equal(ledger.finalize('once', 30).ok, true)
  assert.equal(ledger.finalize('once', 30).ok, false)
  assert.equal(ledger.unknown('once').ok, false)
  assert.equal(ledger.snapshot().settledMicrousd, 30)
})

test('invalid values and unverified transitions fail closed', () => {
  const ledger = createLedgerContractMock({ capMicrousd: 100 })
  assert.equal(ledger.reserve('bad', Number.NaN).ok, false)
  assert.equal(ledger.start('missing').ok, false)
  ledger.reserve('known', 50)
  ledger.unknown('known')
  assert.equal(ledger.finalize('known', 0).ok, false)
  assert.equal(ledger.finalize('known', 60, { reconciled: true }).ok, false)
  assert.equal(ledger.snapshot().reservedMicrousd, 50)
})
