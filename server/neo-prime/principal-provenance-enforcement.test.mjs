import test from 'node:test'
import assert from 'node:assert/strict'
import { createPrincipalFactory } from './trusted-principal-factory.mjs'
import { createAuthenticatedTenantResolver } from './authenticated-tenant-context.mjs'
import { createTenantIdempotencyRegistry } from './tenant-idempotency.mjs'
import { evaluateReplay } from './ledger-safe-replay.mjs'

const verify = async token => token === 'allow-A'
  ? { subject: 'subject-A', tenantId: 'tenant-A' }
  : token === 'allow-B'
    ? { subject: 'subject-B', tenantId: 'tenant-B' }
    : null

test('forged verified flag cannot authorize a tenant-scoped ledger lookup', async () => {
  const factory = createPrincipalFactory(verify)
  const resolve = createAuthenticatedTenantResolver(factory)
  const registry = createTenantIdempotencyRegistry()
  const verified = await factory.authenticate('allow-A')
  assert.equal(verified.ok, true)
  const context = resolve({ verifiedPrincipal: verified.principal })
  assert.equal(context.ok, true)
  assert.equal(registry.reserve({ authenticatedTenant: context.authenticatedTenant, key: 'same', attempt: { state: 'reserved' } }).ok, true)
  const forged = { verified: true, subject: 'subject-B', tenantId: 'tenant-A' }
  const spoof = resolve({ verifiedPrincipal: forged })
  assert.deepEqual(spoof, { ok: false, reason: 'authentication_required' })
  assert.equal(spoof.authenticatedTenant, undefined)
  assert.equal(evaluateReplay({ lookupFailed: true }).invokeProvider, false)
})

test('copying, freezing or mutating a principal cannot transfer provenance', async () => {
  const factory = createPrincipalFactory(verify)
  const resolve = createAuthenticatedTenantResolver(factory)
  const verified = await factory.authenticate('allow-A')
  const copied = Object.freeze({ ...verified.principal })
  assert.equal(resolve({ verifiedPrincipal: copied }).ok, false)
  assert.equal(resolve({ verifiedPrincipal: { ...verified.principal, tenantId: 'tenant-B' } }).ok, false)
  assert.equal(resolve({ verifiedPrincipal: verified.principal }).authenticatedTenant, 'tenant-A')
  assert.equal(factory.isMinted(copied), false)
})

test('a principal minted by another factory is not accepted', async () => {
  const trustedFactory = createPrincipalFactory(verify)
  const otherFactory = createPrincipalFactory(verify)
  const resolve = createAuthenticatedTenantResolver(trustedFactory)
  const foreignPrincipal = await otherFactory.authenticate('allow-B')
  assert.equal(foreignPrincipal.ok, true)
  assert.equal(resolve({ verifiedPrincipal: foreignPrincipal.principal }).reason, 'authentication_required')
})

test('an attestor that throws or returns a non-boolean fails closed', () => {
  const principal = Object.freeze({ verified: true, subject: 's', tenantId: 'A' })
  for (const isMinted of [() => { throw new Error('private') }, () => 1, () => undefined]) {
    const resolve = createAuthenticatedTenantResolver({ isMinted })
    assert.deepEqual(resolve({ verifiedPrincipal: principal }), { ok: false, reason: 'authentication_required' })
  }
})

test('invalid verifier output never creates usable tenant context', async () => {
  const factory = createPrincipalFactory(async () => ({ subject: '', tenantId: 'A' }))
  const attempted = await factory.authenticate('anything')
  assert.equal(attempted.ok, false)
  const resolve = createAuthenticatedTenantResolver(factory)
  assert.equal(resolve({ verifiedPrincipal: attempted.principal }).ok, false)
})
