import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveAuthenticatedTenant } from './authenticated-tenant-context.mjs'
import { createTenantIdempotencyRegistry } from './tenant-idempotency.mjs'

const principal = { verified: true, tenantId: 'tenant-A' }

test('verified server principal establishes tenant identity', () => {
  assert.deepEqual(resolveAuthenticatedTenant({ verifiedPrincipal: principal }), { ok: true, authenticatedTenant: 'tenant-A' })
})

test('unverified and missing principal fail closed', () => {
  for (const verifiedPrincipal of [null, {}, { verified: false, tenantId: 'tenant-A' }, { verified: true }, { verified: true, tenantId: '' }]) {
    assert.equal(resolveAuthenticatedTenant({ verifiedPrincipal }).ok, false)
  }
})

test('request body, query, and headers cannot override tenant identity', () => {
  const attempts = [
    { requestBody: { tenantId: 'tenant-B' } },
    { requestBody: { tenant_id: 'tenant-B' } },
    { requestQuery: { tenantId: 'tenant-B' } },
    { requestHeaders: { 'x-tenant-id': 'tenant-B' } },
    { requestHeaders: { 'X-Tenant-ID': 'tenant-B' } },
  ]
  for (const input of attempts) {
    assert.equal(resolveAuthenticatedTenant({ verifiedPrincipal: principal, ...input }).reason, 'tenant_override_forbidden')
  }
})

test('tenant context can scope idempotency lookup without cross-tenant disclosure', () => {
  const registry = createTenantIdempotencyRegistry()
  const context = resolveAuthenticatedTenant({ verifiedPrincipal: principal })
  assert.equal(context.ok, true)
  registry.reserve({ authenticatedTenant: context.authenticatedTenant, key: 'same', attempt: { state: 'reserved' } })
  assert.equal(registry.lookup({ authenticatedTenant: 'tenant-B', key: 'same' }).reason, 'not_found')
})
