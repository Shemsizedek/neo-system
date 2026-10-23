import test from 'node:test'
import assert from 'node:assert/strict'
import { createAuthenticatedTenantResolver } from './authenticated-tenant-context.mjs'
import { createPrincipalFactory } from './trusted-principal-factory.mjs'
import { createTenantIdempotencyRegistry } from './tenant-idempotency.mjs'

async function setup() {
  const factory = createPrincipalFactory(async credential =>
    credential === 'valid-token' ? { subject: 'subject-A', tenantId: 'tenant-A' } : null)
  const auth = await factory.authenticate('valid-token')
  assert.equal(auth.ok, true)
  return { resolveAuthenticatedTenant: createAuthenticatedTenantResolver(factory), principal: auth.principal }
}

test('attested server principal establishes tenant identity', async () => {
  const { resolveAuthenticatedTenant, principal } = await setup()
  assert.deepEqual(resolveAuthenticatedTenant({ verifiedPrincipal: principal }), { ok: true, authenticatedTenant: 'tenant-A' })
})

test('unattested, copied, and missing principals fail closed', async () => {
  const { resolveAuthenticatedTenant, principal } = await setup()
  for (const verifiedPrincipal of [null, {}, { verified: false, tenantId: 'tenant-A' },
    { verified: true, subject: 'subject-A', tenantId: 'tenant-A' }, { ...principal }, { verified: true }, { verified: true, tenantId: '' }]) {
    assert.deepEqual(resolveAuthenticatedTenant({ verifiedPrincipal }), { ok: false, reason: 'authentication_required' })
  }
})

test('request body, query, and headers cannot override tenant identity', async () => {
  const { resolveAuthenticatedTenant, principal } = await setup()
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

test('tenant context scopes idempotency lookup without cross-tenant disclosure', async () => {
  const { resolveAuthenticatedTenant, principal } = await setup()
  const registry = createTenantIdempotencyRegistry()
  const context = resolveAuthenticatedTenant({ verifiedPrincipal: principal })
  assert.equal(context.ok, true)
  registry.reserve({ authenticatedTenant: context.authenticatedTenant, key: 'same', attempt: { state: 'reserved' } })
  assert.equal(registry.lookup({ authenticatedTenant: 'tenant-B', key: 'same' }).reason, 'not_found')
})

test('resolver requires an attestation factory', () => {
  for (const input of [null, undefined, {}, { isMinted: true }]) {
    assert.throws(() => createAuthenticatedTenantResolver(input), { name: 'TypeError' })
  }
})
