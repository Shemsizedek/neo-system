import test from 'node:test'
import assert from 'node:assert/strict'
import { createPrincipalFactory } from './trusted-principal-factory.mjs'
import { createAuthenticatedTenantResolver } from './authenticated-tenant-context.mjs'

test('only verifier-produced identity creates a frozen principal', async () => {
  const factory = createPrincipalFactory(async credential =>
    credential === 'test-token' ? { subject: 'subject-1', tenantId: 'tenant-A' } : null)
  const good = await factory.authenticate('test-token')
  assert.equal(good.ok, true)
  assert.equal(factory.isMinted(good.principal), true)
  assert.equal(Object.isFrozen(good.principal), true)
  assert.deepEqual(createAuthenticatedTenantResolver(factory)({ verifiedPrincipal: good.principal }),
    { ok: true, authenticatedTenant: 'tenant-A' })
})

test('forged object cannot pass factory provenance check', async () => {
  const factory = createPrincipalFactory(async () => ({ subject: 'subject-1', tenantId: 'tenant-A' }))
  const result = await factory.authenticate('token')
  const forged = { ...result.principal, tenantId: 'tenant-B' }
  assert.equal(factory.isMinted(forged), false)
  assert.equal(factory.isMinted({ verified: true, tenantId: 'tenant-A' }), false)
})

test('invalid identity and verifier exceptions fail closed', async () => {
  for (const verify of [async () => null, async () => ({ tenantId: 'A' }), async () => { throw new Error('secret') }]) {
    const factory = createPrincipalFactory(verify)
    assert.deepEqual(await factory.authenticate('bad'), { ok: false, reason: 'authentication_failed' })
  }
})

test('different factories cannot attest each others principals', async () => {
  const verify = async () => ({ subject: 's', tenantId: 'A' })
  const a = createPrincipalFactory(verify)
  const b = createPrincipalFactory(verify)
  const result = await a.authenticate('token')
  assert.equal(a.isMinted(result.principal), true)
  assert.equal(b.isMinted(result.principal), false)
})
