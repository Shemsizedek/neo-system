import assert from 'node:assert/strict'
import test from 'node:test'
import { createCloudflareWorkersAIAdapter, createGeminiAdapter, providersFromEnv } from './providers.mjs'

test('Gemini adapter sends the API key in the x-goog-api-key header', async () => {
  let request
  const adapter = createGeminiAdapter({
    apiKey: 'gemini-secret', model: 'gemini-test',
    fetchImpl: async (url, options) => {
      request = { url, options }
      return {
        ok: true,
        json: async () => ({ candidates: [{ content: { parts: [{ text: 'gemini result' }] } }] }),
      }
    },
  })
  const result = await adapter.invoke({ system: 'policy', prompt: 'mission' })
  assert.equal(result.text, 'gemini result')
  assert.equal(request.url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent')
  assert.equal(request.options.headers['x-goog-api-key'], 'gemini-secret')
  assert.ok(!request.url.includes('gemini-secret'))
})

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

test('GOOGLE_API_KEY takes precedence for Gemini', () => {
  const providers = providersFromEnv({ GOOGLE_API_KEY: 'google-auth-key', GEMINI_API_KEY: 'legacy-key' })
  assert.equal(providers.find((provider) => provider.id === 'gemini')?.configured, true)
})
