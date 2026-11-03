import test from 'node:test'
import assert from 'node:assert/strict'
import { createOllamaAdapter } from './ollama-provider.mjs'
import { providersFromEnv } from './providers.mjs'
import { createNeoRouter } from './router.mjs'

const config = { baseUrl: 'http://127.0.0.1:11434', model: 'test-model' }
test('Ollama is opt-in and validates endpoint configuration', () => {
  assert.equal(createOllamaAdapter().configured, false)
  assert.equal(providersFromEnv({}).some(p => p.id === 'ollama'), false)
  assert.equal(providersFromEnv({ OLLAMA_BASE_URL: config.baseUrl }).some(p => p.id === 'ollama'), false)
  assert.equal(providersFromEnv({ OLLAMA_BASE_URL: config.baseUrl, OLLAMA_MODEL: config.model })[0].configured, true)
  for (const baseUrl of ['file:///tmp/model', 'https://user:pass@host', 'https://host/api', 'https://host/?token=secret', 'https://host/#secret']) {
    assert.throws(() => createOllamaAdapter({ ...config, baseUrl }), /origin/)
  }
})
test('native chat request carries NEO instructions and bounded token count', async () => {
  let request
  const adapter = createOllamaAdapter({ ...config, fetchImpl: async (url, options) => {
    request = { url, options, body: JSON.parse(options.body) }
    return { ok: true, json: async () => ({ done: true, message: { content: 'local answer' } }) }
  } })
  assert.deepEqual(await adapter.invoke({ system: 'NEO instructions', prompt: 'test', maxTokens: 200 }), {
    provider: 'ollama', model: config.model, text: 'local answer',
  })
  assert.equal(request.url, config.baseUrl + '/api/chat')
  assert.equal(request.options.redirect, 'error')
  assert.equal(request.body.stream, false)
  assert.equal(request.body.options.num_predict, 200)
  assert.equal(request.body.messages[0].content, 'NEO instructions')
  await assert.rejects(adapter.invoke({ prompt: 'test', maxTokens: -1 }), /maxTokens/)
})
test('errors are closed and do not expose upstream bodies', async () => {
  for (const response of [
    { ok: false, status: 500, json: async () => ({ error: 'secret' }) },
    { ok: true, json: async () => ({ done: false, message: { content: 'partial' } }) },
    { ok: true, json: async () => ({ done: true, error: 'secret' }) },
  ]) {
    const adapter = createOllamaAdapter({ ...config, fetchImpl: async () => response })
    await assert.rejects(adapter.invoke({ prompt: 'test' }), error => !error.message.includes('secret'))
  }
})
test('timeout covers response body consumption', async () => {
  const adapter = createOllamaAdapter({ ...config, timeoutMs: 10, fetchImpl: async (_, { signal }) => ({
    ok: true, json: () => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true })
    }),
  }) })
  await assert.rejects(adapter.invoke({ prompt: 'test' }), /aborted/)
})
test('local inference does not fall back to cloud and retains Router action policy', async () => {
  let cloudCalls = 0
  const router = createNeoRouter({ providers: [
    createOllamaAdapter({ ...config, fetchImpl: async () => { throw new Error('offline') } }),
    { id: 'openai', configured: true, invoke: async () => { cloudCalls++; return {} } },
  ] })
  const mission = { missionId: 'oss-001', objective: 'test', capability: 'local-inference' }
  const result = await router.execute(mission)
  assert.equal(result.status, 'blocked')
  assert.deepEqual(result.candidates, ['ollama'])
  assert.equal(cloudCalls, 0)
  assert.equal((await router.execute({ ...mission, actions: ['transaction'] })).status, 'awaiting_approval')
})
