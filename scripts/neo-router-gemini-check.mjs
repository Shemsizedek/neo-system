import { providersFromEnv } from '../server/neo-router/providers.mjs'

const providers = providersFromEnv(process.env)
const gemini = providers.find((provider) => provider.id === 'gemini')

if (!gemini?.configured) {
  console.error(JSON.stringify({
    ok: false,
    provider: 'gemini',
    configured: false,
    message: 'Set GOOGLE_API_KEY or GEMINI_API_KEY in the server runtime before running this check.',
  }, null, 2))
  process.exitCode = 2
} else {
  try {
    const result = await gemini.invoke({
      system: 'You are a production readiness probe. Return exactly NEO_GEMINI_OK and nothing else.',
      prompt: 'Confirm the Gemini provider connection.',
      maxTokens: 32,
    })

    const text = String(result.text ?? '').trim()
    const ok = text.includes('NEO_GEMINI_OK')

    console.log(JSON.stringify({
      ok,
      provider: result.provider,
      model: result.model,
      configured: true,
      responseMatched: ok,
    }, null, 2))

    if (!ok) process.exitCode = 1
  } catch (error) {
    console.error(JSON.stringify({
      ok: false,
      provider: 'gemini',
      configured: true,
      message: error instanceof Error ? error.message : String(error),
      status: Number.isInteger(error?.status) ? error.status : undefined,
    }, null, 2))
    process.exitCode = 1
  }
}
