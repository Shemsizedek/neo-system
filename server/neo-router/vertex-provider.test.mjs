import assert from 'node:assert/strict'
import test from 'node:test'
import { createVertexGeminiAdapter } from './vertex-provider.mjs'

test('Vertex adapter obtains metadata token and calls regional generateContent', async () => {
  const calls = []
  const adapter = createVertexGeminiAdapter({
    projectId: 'neo-project',
    location: 'us-central1',
    model: 'gemini-test',
    fetchImpl: async (url, options = {}) => {
      calls.push({ url, options })
      if (url.startsWith('http://metadata.google.internal/')) {
        return { ok: true, status: 200, json: async () => ({ access_token: 'adc-token' }) }
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ candidates: [{ content: { parts: [{ text: 'vertex result' }] } }] }),
      }
    },
  })
  const result = await adapter.invoke({ system: 'policy', prompt: 'mission' })
  assert.equal(result.text, 'vertex result')
  assert.equal(calls[0].options.headers['Metadata-Flavor'], 'Google')
  assert.match(calls[1].url, /us-central1-aiplatform\.googleapis\.com\/v1\/projects\/neo-project\/locations\/us-central1\/publishers\/google\/models\/gemini-test:generateContent$/)
  assert.equal(calls[1].options.headers.authorization, 'Bearer adc-token')
})

test('Vertex adapter is configured from project and location only', () => {
  assert.equal(createVertexGeminiAdapter({ projectId: 'neo-project', location: 'us-central1' }).configured, true)
})
