import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequestLimiter } from './request-limiter.mjs'

test('limits per identity and resets at window boundary', () => {
  let now = 100
  const limiter = createRequestLimiter({ limit: 2, windowMs: 1000, now: () => now })
  assert.equal(limiter.check('client-a').allowed, true)
  assert.equal(limiter.check('client-a').allowed, true)
  assert.equal(limiter.check('client-a').reason, 'rate_limited')
  assert.equal(limiter.check('client-b').allowed, true)
  now = 1100
  assert.equal(limiter.check('client-a').allowed, true)
})

test('fails closed for missing identity and exhausted tracking capacity', () => {
  const limiter = createRequestLimiter({ limit: 1, maxKeys: 1, now: () => 0 })
  assert.equal(limiter.check('').reason, 'missing_identity')
  assert.equal(limiter.check('one').allowed, true)
  assert.equal(limiter.check('two').reason, 'capacity_exceeded')
})

test('rejects invalid limiter settings', () => {
  assert.throws(() => createRequestLimiter({ limit: 0 }), /invalid_limits/)
})
