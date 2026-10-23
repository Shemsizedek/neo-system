import test from 'node:test'
import assert from 'node:assert/strict'
import { createBudgetSimulator } from './budget-simulator.mjs'

test('unknown timeout retains reservation until explicit reconciliation', () => {
  const ledger = createBudgetSimulator({ capMicrousd: 100 })
  ledger.reserve({ key: 'timeout', amountMicrousd: 90 })
  assert.equal(ledger.markUnknown('timeout').allowed, true)
  assert.equal(ledger.reserve({ key: 'other', amountMicrousd: 20 }).reason, 'budget_exhausted')
  assert.equal(ledger.reconcile({ key: 'timeout', verifiedCostMicrousd: 30 }).allowed, true)
  assert.equal(ledger.snapshot().availableMicrousd, 70)
  assert.equal(ledger.snapshot().settledMicrousd, 30)
})

test('reconciliation rejects duplicates, excessive and malformed amounts', () => {
  const ledger = createBudgetSimulator({ capMicrousd: 100 })
  ledger.reserve({ key: 'crash', amountMicrousd: 70 })
  ledger.markUnknown('crash')
  assert.equal(ledger.reconcile({ key: 'crash', verifiedCostMicrousd: 80 }).allowed, false)
  assert.equal(ledger.reconcile({ key: 'crash', verifiedCostMicrousd: -1 }).allowed, false)
  assert.equal(ledger.reconcile({ key: 'crash', verifiedCostMicrousd: 20 }).allowed, true)
  assert.equal(ledger.reconcile({ key: 'crash', verifiedCostMicrousd: 20 }).allowed, false)
  assert.equal(ledger.snapshot().settledMicrousd, 20)
})

test('crash snapshot preserves unknown status and held budget in memory', () => {
  const ledger = createBudgetSimulator({ capMicrousd: 100 })
  ledger.reserve({ key: 'crash', amountMicrousd: 80 })
  ledger.markUnknown('crash')
  const snapshot = ledger.snapshot()
  assert.equal(snapshot.entries[0].status, 'unknown')
  assert.equal(snapshot.reservedMicrousd, 80)
  assert.equal(snapshot.availableMicrousd, 20)
})
