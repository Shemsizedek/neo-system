import { createMetaLlamaAdapter } from '../server/neo-router/providers.mjs'

const adapter = createMetaLlamaAdapter({
  apiKey: process.env.LLAMA_API_KEY,
  model: process.env.LLAMA_MODEL || undefined,
  baseUrl: process.env.LLAMA_API_BASE || undefined,
})

if (!adapter.configured) {
  console.error(JSON.stringify({ service: 'neo-router', provider: 'meta-llama', status: 'unconfigured' }))
  process.exit(1)
}

try {
  const result = await adapter.invoke({
    system: 'You are a read-only provider health probe. Do not call tools or perform external actions.',
    prompt: 'Reply with exactly NEO_LLAMA_OK',
    maxTokens: 32,
  })
  const healthy = result.text.trim().includes('NEO_LLAMA_OK')
  console.log(JSON.stringify({
    service: 'neo-router',
    provider: result.provider,
    model: result.model,
    status: healthy ? 'healthy' : 'unexpected-response',
    text: result.text.trim(),
  }))
  process.exit(healthy ? 0 : 2)
} catch (error) {
  console.error(JSON.stringify({
    service: 'neo-router',
    provider: 'meta-llama',
    status: 'error',
    error: error?.message || 'unknown error',
  }))
  process.exit(1)
}
