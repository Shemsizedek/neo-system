import { providersFromEnv } from '../server/neo-router/providers.mjs'

const providers = providersFromEnv(process.env)
const muse = providers.find((provider) => provider.id === 'meta-muse')

if (!muse?.configured) {
  console.error(JSON.stringify({
    ok: false,
    provider: 'meta-muse',
    configured: false,
    message: 'Set MODEL_API_KEY in the server runtime before running this check.',
  }, null, 2))
  process.exitCode = 2
} else {
  try {
    const result = await muse.invoke({
      system: 'You are a production readiness probe. Return exactly NEO_MUSE_OK and nothing else.',
      prompt: 'Confirm the Meta Muse provider connection.',
      maxTokens: 32,
    })

    const text = String(result.text ?? '').trim()
    const ok = text === 'NEO_MUSE_OK'

    console.log(JSON.stringify({
      ok,
      provider: result.provider,
      model: result.model,
      configured: true,
      responseMatched: ok,
      responseIdPresent: Boolean(result.responseId),
    }, null, 2))

    if (!ok) process.exitCode = 1
  } catch (error) {
    console.error(JSON.stringify({
      ok: false,
      provider: 'meta-muse',
      configured: true,
      message: error instanceof Error ? error.message : String(error),
      status: Number.isInteger(error?.status) ? error.status : undefined,
    }, null, 2))
    process.exitCode = 1
  }
}
