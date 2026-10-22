import test from 'node:test'
import assert from 'node:assert/strict'
import { createNeoRouter } from './router.mjs'

test('limits failed provider attempts to two', async () => {
  const attempts = []
  const providers = ['openai', 'meta-muse', 'anthropic'].map(id => ({
    id, configured: true,
    async invoke() { attempts.push(id); throw new Error('unavailable') },
  }))
  const router = createNeoRouter({ providers })
  const result = await router.execute({ missionId: 'attempt-1', objective: 'test', capability: 'reasoning' })
  assert.equal(result.status, 'blocked')
  assert.equal(attempts.length, 2)
  assert.equal(result.failures.length, 2)
})

test('rejects higher configured attempt ceilings', () => {
  assert.throws(() => createNeoRouter({ providers: [], maxHops: 3 }), /invalid_provider_attempt_ceiling/)
  assert.throws(() => createNeoRouter({ providers: [], maxHops: 0 }), /invalid_provider_attempt_ceiling/)
})
