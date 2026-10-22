import test from 'node:test'
import assert from 'node:assert/strict'
import { createConcurrencyLimiter } from './concurrency-limiter.mjs'

test('enforces per-client and global concurrency ceilings', () => {
  const limiter = createConcurrencyLimiter({ perIdentity: 2, globalLimit: 3 })
  const a1 = limiter.acquire('a')
  const a2 = limiter.acquire('a')
  assert.equal(a1.allowed, true)
  assert.equal(a2.allowed, true)
  assert.equal(limiter.acquire('a').reason, 'concurrency_exceeded')
  const b1 = limiter.acquire('b')
  assert.equal(b1.allowed, true)
  assert.equal(limiter.acquire('c').reason, 'concurrency_exceeded')
  a1.release()
  a1.release()
  assert.equal(limiter.acquire('c').allowed, true)
  a2.release()
  b1.release()
})

test('rejects missing identities and invalid ceilings', () => {
  assert.equal(createConcurrencyLimiter().acquire('').reason, 'missing_identity')
  assert.throws(() => createConcurrencyLimiter({ globalLimit: 0 }), /invalid_concurrency_limits/)
})
