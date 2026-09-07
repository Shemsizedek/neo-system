import { providersFromEnv } from '../server/neo-router/providers.mjs'

const providers = providersFromEnv(process.env)
const xai = providers.find((provider) => provider.id === 'xai')

if (!xai?.configured) {
  console.error(JSON.stringify({
    service: 'neo-router',
    provider: 'xai',
    status: 'unconfigured',
    requiredEnv: 'XAI_API_KEY',
  }))
  process.exit(2)
}

try {
  const result = await xai.invoke({
    system: 'You are a read-only NEO Router provider health check. Do not call tools or request external actions.',
    prompt: 'Reply with exactly: NEO_XAI_OK',
    maxTokens: 32,
  })

  const ok = result.text.trim().includes('NEO_XAI_OK')
  console.log(JSON.stringify({
    service: 'neo-router',
    provider: 'xai',
    model: result.model,
    status: ok ? 'healthy' : 'unexpected_response',
    text: result.text.trim(),
  }))
  process.exit(ok ? 0 : 1)
} catch (error) {
  console.error(JSON.stringify({
    service: 'neo-router',
    provider: 'xai',
    status: 'error',
    message: error?.message ?? String(error),
    httpStatus: error?.status ?? null,
  }))
  process.exit(1)
}
