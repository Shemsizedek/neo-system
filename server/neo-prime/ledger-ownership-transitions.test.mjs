import test from 'node:test'
import assert from 'node:assert/strict'
import { createPrincipalFactory } from './trusted-principal-factory.mjs'
import { createServerBoundTenantLedger } from './server-bound-tenant-ledger.mjs'
import { createTenantIdempotencyRegistry } from './tenant-idempotency.mjs'
import { evaluateReplay } from './ledger-safe-replay.mjs'

async function setup() {
  const factory = createPrincipalFactory(async credential => {
    if (credential === 'token-A') return { subject: 'subject-A', tenantId: 'tenant-A' }
    if (credential === 'token-B') return { subject: 'subject-B', tenantId: 'tenant-B' }
    return null
  })
  const registry = createTenantIdempotencyRegistry()
  const ledger = createServerBoundTenantLedger({ principalFactory: factory, registry })
  const a = await factory.authenticate('token-A')
  const b = await factory.authenticate('token-B')
  assert.equal(a.ok, true)
  assert.equal(b.ok, true)
  return {
    registry, ledger,
    a: ledger.bind({ verifiedPrincipal: a.principal }).operations,
    b: ledger.bind({ verifiedPrincipal: b.principal }).operations,
  }
}

test('same idempotency key has independent tenant-owned state transitions', async () => {
  const { a, b } = await setup()
  const request = { key: 'same', attempt: { state: 'reserved', maxChargeMicrousd: 80 } }
  assert.deepEqual(a.reserve(request), { ok: true })
  assert.deepEqual(b.reserve(request), { ok: true })
  assert.equal(a.start({ key: 'same' }).ok, true)
  assert.equal(a.lookup({ key: 'same' }).attempt.state, 'started')
  assert.equal(b.lookup({ key: 'same' }).attempt.state, 'reserved')
  assert.equal(a.settle({ key: 'same', billedMicrousd: 25 }).ok, true)
  assert.equal(b.unknown({ key: 'same' }).ok, true)
  assert.equal(b.reconcile({ key: 'same', billedMicrousd: 15 }).ok, true)
  assert.deepEqual(a.lookup({ key: 'same' }).attempt, {
    state: 'settled', maxChargeMicrousd: 80, billedMicrousd: 25,
  })
  assert.deepEqual(b.lookup({ key: 'same' }).attempt, {
    state: 'reconciled', maxChargeMicrousd: 80, billedMicrousd: 15,
  })
  assert.equal(evaluateReplay({ attempt: a.lookup({ key: 'same' }).attempt }).invokeProvider, false)
  assert.equal(evaluateReplay({ attempt: b.lookup({ key: 'same' }).attempt }).invokeProvider, false)
})

test('missing tenant ownership never discovers or changes another tenant attempt', async () => {
  const { a, b } = await setup()
  a.reserve({ key: 'private', attempt: { state: 'reserved', maxChargeMicrousd: 70 } })
  for (const result of [
    b.lookup({ key: 'private' }), b.start({ key: 'private' }),
    b.unknown({ key: 'private' }), b.settle({ key: 'private', billedMicrousd: 15 }),
    b.reconcile({ key: 'private', billedMicrousd: 15 }),
  ]) assert.deepEqual(result, { ok: false, reason: 'not_found' })
  assert.deepEqual(a.lookup({ key: 'private' }).attempt,
    { state: 'reserved', maxChargeMicrousd: 70 })
  // Tenant B can reserve its own key without colliding with tenant A's.
  assert.equal(b.reserve({ key: 'private', attempt: { state: 'reserved', maxChargeMicrousd: 25 } }).ok, true)
  assert.equal(b.start({ key: 'private' }).ok, true)
  assert.equal(b.settle({ key: 'private', billedMicrousd: 20 }).ok, true)
  assert.equal(a.lookup({ key: 'private' }).attempt.state, 'reserved')
})

test('legacy unpriced mock reservation cannot begin a priced attempt', async () => {
  const { a } = await setup()
  assert.equal(a.reserve({ key: 'legacy', attempt: { state: 'reserved' } }).ok, true)
  assert.deepEqual(a.lookup({ key: 'legacy' }).attempt, { state: 'reserved' })
  assert.equal(a.start({ key: 'legacy' }).reason, 'reservation_limit_required')
  assert.equal(a.unknown({ key: 'legacy' }).reason, 'invalid_transition')
  assert.equal(a.settle({ key: 'legacy', billedMicrousd: 0 }).reason, 'invalid_transition')
  assert.equal(a.lookup({ key: 'legacy' }).attempt.state, 'reserved')
})

test('unknown provider outcome cannot settle until mock reconciliation', async () => {
  const { a } = await setup()
  a.reserve({ key: 'uncertain', attempt: { state: 'reserved', maxChargeMicrousd: 50 } })
  assert.equal(a.start({ key: 'uncertain' }).ok, true)
  assert.equal(a.unknown({ key: 'uncertain' }).ok, true)
  assert.equal(a.settle({ key: 'uncertain', billedMicrousd: 5 }).reason, 'invalid_transition')
  assert.equal(a.start({ key: 'uncertain' }).reason, 'invalid_transition')
  assert.equal(a.reconcile({ key: 'uncertain', billedMicrousd: 51 }).reason, 'invalid_charge')
  assert.equal(a.lookup({ key: 'uncertain' }).attempt.state, 'unknown')
  assert.equal(a.reconcile({ key: 'uncertain', billedMicrousd: 20 }).ok, true)
  assert.equal(a.reconcile({ key: 'uncertain', billedMicrousd: 20 }).reason, 'invalid_transition')
  assert.equal(a.unknown({ key: 'uncertain' }).reason, 'invalid_transition')
  assert.equal(a.lookup({ key: 'uncertain' }).attempt.billedMicrousd, 20)
})

test('settlement validates bounded test amounts and is never charged twice', async () => {
  const { a } = await setup()
  a.reserve({ key: 'bounded', attempt: { state: 'reserved', maxChargeMicrousd: 40 } })
  assert.equal(a.start({ key: 'bounded' }).ok, true)
  assert.equal(a.start({ key: 'bounded' }).reason, 'invalid_transition')
  for (const invalid of [-1, 40.5, Number.NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, 41]) {
    assert.equal(a.settle({ key: 'bounded', billedMicrousd: invalid }).ok, false)
    assert.equal(a.lookup({ key: 'bounded' }).attempt.state, 'started')
  }
  assert.equal(a.settle({ key: 'bounded', billedMicrousd: 40 }).ok, true)
  assert.equal(a.settle({ key: 'bounded', billedMicrousd: 40 }).reason, 'invalid_transition')
  assert.equal(a.reconcile({ key: 'bounded', billedMicrousd: 40 }).reason, 'invalid_transition')
  assert.equal(a.lookup({ key: 'bounded' }).attempt.billedMicrousd, 40)
})

test('tenant injection is rejected in every operation and does not mutate state', async () => {
  const { a } = await setup()
  a.reserve({ key: 'safe', attempt: { state: 'reserved', maxChargeMicrousd: 80 } })
  const forbidden = [
    ['lookup', { key: 'safe', tenantId: 'tenant-B' }],
    ['start', { key: 'safe', authenticatedTenant: 'tenant-B' }],
    ['unknown', { key: 'safe', tenant_id: 'tenant-B' }],
    ['settle', { key: 'safe', billedMicrousd: 4, tenantId: 'tenant-B' }],
    ['reconcile', { key: 'safe', billedMicrousd: 4, authenticatedTenant: 'tenant-B' }],
    ['reserve', { key: 'new', attempt: { state: 'reserved', maxChargeMicrousd: 5, tenantId: 'tenant-B' } }],
    ['reserve', { key: 'new', attempt: { state: 'reserved', maxChargeMicrousd: 5 }, tenantId: 'tenant-B' }],
    ['reserve', { key: 'new', attempt: { state: 'reserved', maxChargeMicrousd: 0 } }],
    ['reserve', { key: 'new', attempt: { state: 'reserved', maxChargeMicrousd: -1 } }],
  ]
  for (const [method, input] of forbidden) {
    assert.deepEqual(a[method](input), { ok: false, reason: 'invalid_operation' })
  }
  assert.equal(a.lookup({ key: 'safe' }).attempt.state, 'reserved')
  assert.equal(a.lookup({ key: 'new' }).reason, 'not_found')
  assert.equal(a.start(null).reason, 'invalid_operation')
  assert.equal(a.unknown(null).reason, 'invalid_operation')
  assert.equal(a.settle(null).reason, 'invalid_operation')
  assert.equal(a.reconcile(null).reason, 'invalid_operation')
})

test('registry failures deny every bound state transition without exposing error details', async () => {
  const factory = createPrincipalFactory(async () => ({ subject: 'subject', tenantId: 'tenant' }))
  const auth = await factory.authenticate('test')
  const fail = () => { throw new Error('sensitive internal account ID') }
  const ledger = createServerBoundTenantLedger({ principalFactory: factory,
    registry: { reserve: fail, lookup: fail, start: fail, unknown: fail, settle: fail, reconcile: fail },
  })
  const operations = ledger.bind({ verifiedPrincipal: auth.principal }).operations
  const inputs = [
    ['reserve', { key: 'key', attempt: { state: 'reserved', maxChargeMicrousd: 1 } }],
    ['lookup', { key: 'key' }], ['start', { key: 'key' }], ['unknown', { key: 'key' }],
    ['settle', { key: 'key', billedMicrousd: 1 }],
    ['reconcile', { key: 'key', billedMicrousd: 1 }],
  ]
  for (const [method, input] of inputs) {
    assert.deepEqual(operations[method](input), { ok: false, reason: 'ledger_unavailable' })
  }
})
