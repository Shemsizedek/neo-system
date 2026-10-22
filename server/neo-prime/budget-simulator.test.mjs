import test from 'node:test'
import assert from 'node:assert/strict'
import { createBudgetSimulator } from './budget-simulator.mjs'

test('reservation denies exhausted budget and duplicate keys', () => {
  const b = createBudgetSimulator({ capMicrousd: 100 })
  assert.equal(b.reserve({ key: 'one', amountMicrousd: 70 }).allowed, true)
  assert.equal(b.reserve({ key: 'one', amountMicrousd: 70 }).reason, 'duplicate_reservation')
  assert.equal(b.reserve({ key: 'two', amountMicrousd: 40 }).reason, 'budget_exhausted')
  assert.equal(b.snapshot().availableMicrousd, 30)
})

test('settlement releases verified unused reservation only once', () => {
  const b = createBudgetSimulator({ capMicrousd: 100 })
  b.reserve({ key: 'one', amountMicrousd: 80 })
  assert.equal(b.settle({ key: 'one', costMicrousd: 30 }).allowed, true)
  assert.equal(b.snapshot().availableMicrousd, 70)
  assert.equal(b.settle({ key: 'one', costMicrousd: 30 }).allowed, false)
})

test('unknown charges retain full reservation and cannot be silently refunded', () => {
  const b = createBudgetSimulator({ capMicrousd: 100 })
  b.reserve({ key: 'one', amountMicrousd: 80 })
  assert.equal(b.markUnknown('one').allowed, true)
  assert.equal(b.snapshot().reservedMicrousd, 80)
  assert.equal(b.settle({ key: 'one', costMicrousd: 0 }).allowed, false)
})

test('invalid amounts fail closed', () => {
  assert.throws(() => createBudgetSimulator({ capMicrousd: -1 }))
  const b = createBudgetSimulator({ capMicrousd: 100 })
  for (const amountMicrousd of [-1, 0, 1.5, Number.NaN]) {
    assert.equal(b.reserve({ key: String(amountMicrousd), amountMicrousd }).allowed, false)
  }
})

test('simultaneous in-process reservations never exceed cap', async () => {
  const b = createBudgetSimulator({ capMicrousd: 100 })
  const results = await Promise.all(Array.from({ length: 10 }, (_, i) =>
    Promise.resolve().then(() => b.reserve({ key: 'r' + i, amountMicrousd: 30 }))))
  assert.equal(results.filter(x => x.allowed).length, 3)
  assert.equal(b.snapshot().availableMicrousd, 10)
})
