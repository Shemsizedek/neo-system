import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeProviderUsage } from './provider-usage.mjs'

test('reads OpenAI/Anthropic reported usage without estimating missing totals', () => {
  assert.deepEqual(normalizeProviderUsage('openai', { usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 } }), {
    provider: 'openai', inputTokens: 10, outputTokens: 5, totalTokens: 15, reported: true,
  })
  assert.equal(normalizeProviderUsage('anthropic', { usage: { input_tokens: 8, output_tokens: 3 } }).totalTokens, null)
})

test('reads Gemini usage metadata', () => {
  const result = normalizeProviderUsage('gemini', { usageMetadata: { promptTokenCount: 9, candidatesTokenCount: 2, totalTokenCount: 11 } })
  assert.equal(result.totalTokens, 11)
  assert.equal(result.reported, true)
})

test('unknown, invalid or missing usage remains unknown', () => {
  const result = normalizeProviderUsage('other', {})
  assert.equal(result.reported, false)
  assert.equal(result.totalTokens, null)
  assert.equal(normalizeProviderUsage('other', { usage: { total_tokens: -1 } }).reported, false)
})
