import test from 'node:test'
import assert from 'node:assert/strict'
import { createPrincipalFactory } from './trusted-principal-factory.mjs'
import { createTenantIdempotencyRegistry } from './tenant-idempotency.mjs'
import { createServerBoundTenantLedger } from './server-bound-tenant-ledger.mjs'
import { evaluateReplay } from './ledger-safe-replay.mjs'

const verify = async credential => {
  if (credential === 'token-A') return { subject: 'subject-A', tenantId: 'tenant-A' }
  if (credential === 'token-B') return { subject: 'subject-B', tenantId: 'tenant-B' }
  return null
}

async function setup() {
  const principalFactory = createPrincipalFactory(verify)
  const registry = createTenantIdempotencyRegistry()
  const ledger = createServerBoundTenantLedger({ principalFactory, registry })
  const a = await principalFactory.authenticate('token-A')
  const b = await principalFactory.authenticate('token-B')
  assert.equal(a.ok, true)
  assert.equal(b.ok, true)
  return { principalFactory, registry, ledger, a: a.principal, b: b.principal }
}

test('server-bound tenant capabilities isolate identical idempotency keys', async () => {
  const { ledger, a, b } = await setup()
  const aBind = ledger.bind({ verifiedPrincipal: a })
  const bBind = ledger.bind({ verifiedPrincipal: b })
  assert.equal(aBind.ok, true)
  assert.equal(bBind.ok, true)
  assert.equal('authenticatedTenant' in aBind.operations, false)
  assert.equal('tenantId' in aBind.operations, false)
  assert.equal(Object.isFrozen(aBind.operations), true)
  const reservation = { key: 'shared-key', attempt: { state: 'reserved' } }
  assert.deepEqual(aBind.operations.reserve(reservation), { ok: true })
  assert.deepEqual(bBind.operations.lookup({ key: 'shared-key' }), { ok: false, reason: 'not_found' })
  assert.deepEqual(bBind.operations.reserve(reservation), { ok: true })
  assert.equal(aBind.operations.reserve(reservation).reason, 'duplicate')
  assert.equal(bBind.operations.reserve(reservation).reason, 'duplicate')
  assert.equal(aBind.operations.lookup({ key: 'shared-key' }).attempt.state, 'reserved')
  assert.equal(bBind.operations.lookup({ key: 'shared-key' }).attempt.state, 'reserved')
})

test('binding rejects forged or copied principals including verified true flags', async () => {
  const { ledger, a } = await setup()
  for (const forged of [
    { verified: true, subject: 'subject-A', tenantId: 'tenant-A' },
    Object.freeze({ ...a }),
    { ...a, tenantId: 'tenant-B' },
    null,
  ]) {
    const result = ledger.bind({ verifiedPrincipal: forged })
    assert.equal(result.ok, false)
    assert.equal(result.operations, undefined)
  }
  assert.equal(ledger.bind({}).ok, false)
  assert.equal(ledger.bind(null).ok, false)
})

test('principals from another factory are not accepted', async () => {
  const { ledger } = await setup()
  const otherFactory = createPrincipalFactory(verify)
  const foreign = await otherFactory.authenticate('token-B')
  assert.equal(foreign.ok, true)
  assert.equal(ledger.bind({ verifiedPrincipal: foreign.principal }).reason, 'authentication_required')
})

test('explicit tenant fields are rejected at bind and operation boundaries', async () => {
  const { ledger, a } = await setup()
  const blocked = [
    { verifiedPrincipal: a, authenticatedTenant: 'tenant-B' },
    { verifiedPrincipal: a, tenantId: 'tenant-B' },
    { verifiedPrincipal: a, requestBody: { tenantId: 'tenant-B' } },
    { verifiedPrincipal: a, requestQuery: { tenant_id: 'tenant-B' } },
    { verifiedPrincipal: a, requestHeaders: { 'X-Tenant-ID': 'tenant-B' } },
  ]
  for (const context of blocked) {
    const result = ledger.bind(context)
    assert.equal(result.ok, false)
    assert.equal(result.operations, undefined)
  }
  const bound = ledger.bind({ verifiedPrincipal: a })
  assert.equal(bound.ok, true)
  for (const input of [
    { key: 'x', attempt: { state: 'reserved' }, authenticatedTenant: 'tenant-B' },
    { key: 'x', attempt: { state: 'reserved' }, tenantId: 'tenant-B' },
    { key: 'x', attempt: { state: 'reserved', tenantId: 'tenant-B' } },
    { key: 'x', attempt: { state: 'started' } },
    { key: 'x', attempt: null },
    null,
  ]) {
    assert.equal(bound.operations.reserve(input).reason, 'invalid_operation')
  }
  assert.equal(bound.operations.lookup({ key: 'x', tenant_id: 'tenant-B' }).reason, 'invalid_operation')
  assert.equal(bound.operations.lookup({ key: 'x', authenticatedTenant: 'tenant-B' }).reason, 'invalid_operation')
  assert.equal(bound.operations.lookup(null).reason, 'invalid_operation')
  assert.equal(bound.operations.lookup({ key: 'x' }).reason, 'not_found')
})

test('caller mutation of reservation and lookup data cannot change tenant ledger state', async () => {
  const { ledger, a } = await setup()
  const bound = ledger.bind({ verifiedPrincipal: a })
  const attempt = { state: 'reserved' }
  assert.equal(bound.operations.reserve({ key: 'same', attempt }).ok, true)
  attempt.state = 'settled'
  const read = bound.operations.lookup({ key: 'same' })
  read.attempt.state = 'settled'
  assert.equal(bound.operations.lookup({ key: 'same' }).attempt.state, 'reserved')
  assert.equal(evaluateReplay({ attempt: bound.operations.lookup({ key: 'same' }).attempt }).invokeProvider, false)
})

test('dependency errors fail closed without exposing backend details', async () => {
  const factory = createPrincipalFactory(verify)
  const a = await factory.authenticate('token-A')
  const ledger = createServerBoundTenantLedger({
    principalFactory: factory,
    registry: Object.fromEntries(['reserve', 'lookup', 'start', 'unknown', 'settle', 'reconcile']
      .map(method => [method, () => { throw new Error('sensitive storage data') }])),
  })
  const bound = ledger.bind({ verifiedPrincipal: a.principal })
  assert.equal(bound.ok, true)
  assert.deepEqual(bound.operations.reserve({ key: 'x', attempt: { state: 'reserved' } }),
    { ok: false, reason: 'ledger_unavailable' })
  assert.deepEqual(bound.operations.lookup({ key: 'x' }),
    { ok: false, reason: 'ledger_unavailable' })
})

test('refuses to initialize without trusted dependencies', () => {
  for (const deps of [undefined, {}, { principalFactory: {} }, {
    principalFactory: { isMinted() { return true } },
    registry: {},
  }]) {
    assert.throws(() => createServerBoundTenantLedger(deps), { name: 'TypeError' })
  }
})
