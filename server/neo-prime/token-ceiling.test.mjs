import test from 'node:test'
import assert from 'node:assert/strict'
import { enforceOutputTokenCeiling } from './token-ceiling.mjs'

test('defaults to bounded output tokens and accepts smaller valid limits', () => {
  assert.deepEqual(enforceOutputTokenCeiling(undefined), { allowed: true, maxTokens: 1024 })
  assert.deepEqual(enforceOutputTokenCeiling(100), { allowed: true, maxTokens: 100 })
})

test('rejects excessive or malformed token requests', () => {
  assert.equal(enforceOutputTokenCeiling(1025).reason, 'output_token_ceiling_exceeded')
  for (const value of [0, -1, 1.5, '100', Number.POSITIVE_INFINITY]) {
    assert.equal(enforceOutputTokenCeiling(value).reason, 'invalid_max_tokens')
  }
  assert.throws(() => enforceOutputTokenCeiling(100, { ceiling: 0 }), /invalid_token_ceiling/)
})
