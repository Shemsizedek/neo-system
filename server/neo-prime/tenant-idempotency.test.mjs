import test from 'node:test'
import assert from 'node:assert/strict'
import { createTenantIdempotencyRegistry } from './tenant-idempotency.mjs'
import { evaluateReplay } from './ledger-safe-replay.mjs'

test('same idempotency key is independent across authenticated tenants', () => {
  const registry = createTenantIdempotencyRegistry()
  assert.equal(registry.reserve({ authenticatedTenant: 'tenant-A', key: 'shared', attempt: { state: 'reserved' } }).ok, true)
  assert.equal(registry.reserve({ authenticatedTenant: 'tenant-B', key: 'shared', attempt: { state: 'reserved' } }).ok, true)
  assert.equal(registry.reserve({ authenticatedTenant: 'tenant-A', key: 'shared', attempt: { state: 'reserved' } }).reason, 'duplicate')
  assert.equal(registry.lookup({ authenticatedTenant: 'tenant-B', key: 'shared' }).ok, true)
})

test('tenant cannot read another tenant reservation by guessing the key', () => {
  const registry = createTenantIdempotencyRegistry()
  registry.reserve({ authenticatedTenant: 'tenant-A', key: 'secret-key', attempt: { state: 'reserved' } })
  assert.deepEqual(registry.lookup({ authenticatedTenant: 'tenant-B', key: 'secret-key' }), { ok: false, reason: 'not_found' })
  assert.equal(registry.lookup({ authenticatedTenant: 'tenant-A', key: 'secret-key' }).attempt.state, 'reserved')
})

test('invalid or missing tenant fails closed', () => {
  const registry = createTenantIdempotencyRegistry()
  assert.equal(registry.reserve({ key: 'key', attempt: { state: 'reserved' } }).ok, false)
  assert.equal(registry.lookup({ key: 'key' }).ok, false)
  assert.equal(registry.lookup({ authenticatedTenant: '', key: 'key' }).ok, false)
})

test('returned records are copies and cannot mutate registry state', () => {
  const registry = createTenantIdempotencyRegistry()
  registry.reserve({ authenticatedTenant: 'A', key: 'key', attempt: { state: 'reserved', token: 'must-not-store' } })
  const record = registry.lookup({ authenticatedTenant: 'A', key: 'key' })
  record.attempt.state = 'settled'
  assert.deepEqual(registry.lookup({ authenticatedTenant: 'A', key: 'key' }).attempt, { state: 'reserved' })
  assert.equal(evaluateReplay({ attempt: registry.lookup({ authenticatedTenant: 'A', key: 'key' }).attempt }).invokeProvider, false)
})
