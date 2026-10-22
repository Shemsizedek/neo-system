import test from 'node:test'
import assert from 'node:assert/strict'
import { createNeoRouter } from './router.mjs'

test('records failed attempt as unknown usage and succeeding provider reported usage', async () => {
  const router = createNeoRouter({ providers: [
    { id: 'openai', configured: true, async invoke() { throw new Error('unavailable') } },
    { id: 'anthropic', configured: true, async invoke() { return { text: 'ok', raw: { usage: { input_tokens: 12, output_tokens: 4 } } } } },
  ] })
  const result = await router.execute({ missionId: 'ledger-1', objective: 'analyze', capability: 'reasoning' })
  assert.equal(result.status, 'completed')
  assert.equal(result.attempts.length, 2)
  assert.equal(result.attempts[0].status, 'failed')
  assert.equal(result.attempts[0].usage.reported, false)
  assert.equal(result.attempts[1].usage.inputTokens, 12)
})

test('returns attempt ledger even when all providers fail', async () => {
  const router = createNeoRouter({ providers: [
    { id: 'openai', configured: true, async invoke() { throw new Error('failed') } },
  ] })
  const result = await router.execute({ missionId: 'ledger-2', objective: 'analyze', capability: 'reasoning' })
  assert.equal(result.status, 'blocked')
  assert.equal(result.attempts.length, 1)
  assert.equal(result.attempts[0].usage.totalTokens, null)
})
