import assert from 'node:assert/strict'
import test from 'node:test'
import { createCloudflareWorkersAIAdapter, providersFromEnv } from './providers.mjs'

test('Workers AI adapter uses the authenticated account endpoint', async () => {
  let request
  const adapter = createCloudflareWorkersAIAdapter({
    accountId: 'account-1', apiToken: 'secret', model: '@cf/test/model',
    fetchImpl: async (url, options) => {
      request = { url, options }
      return { ok: true, json: async () => ({ result: { response: 'edge result' } }) }
    },
  })
  const result = await adapter.invoke({ system: 'policy', prompt: 'mission' })
  assert.equal(result.text, 'edge result')
  assert.match(request.url, /accounts\/account-1\/ai\/run\/@cf\/test\/model$/)
  assert.equal(request.options.headers.authorization, 'Bearer secret')
})

test('environment config supports all four providers', () => {
  const providers = providersFromEnv({
    ANTHROPIC_API_KEY: 'a', ANTHROPIC_MODEL: 'claude-custom',
    OPENAI_API_KEY: 'o', OPENAI_MODEL: 'openai-custom',
    GEMINI_API_KEY: 'g', GEMINI_MODEL: 'gemini-custom',
    CLOUDFLARE_ACCOUNT_ID: 'c', CLOUDFLARE_API_TOKEN: 't', CLOUDFLARE_WORKERS_AI_MODEL: '@cf/custom',
  })
  assert.deepEqual(providers.map((provider) => provider.id), ['anthropic', 'openai', 'gemini', 'cloudflare'])
  assert.ok(providers.every((provider) => provider.configured))
})
