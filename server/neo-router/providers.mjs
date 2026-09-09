import { createVertexGeminiAdapter } from './vertex-provider.mjs'

const jsonHeaders = (apiKey, extra = {}) => ({
  'content-type': 'application/json',
  ...extra,
  ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
})

async function requestJson(url, options, fetchImpl = fetch, timeoutMs = 30_000) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(new Error(`Provider timed out after ${timeoutMs}ms`)), timeoutMs)
  let response
  try {
    response = await fetchImpl(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(`Provider request failed (${response.status})`)
    error.status = response.status
    error.providerBody = body
    throw error
  }
  return body
}

function responseText(body) {
  if (typeof body?.output_text === 'string') return body.output_text
  return body?.output
    ?.flatMap((item) => item?.content ?? [])
    ?.map((part) => part?.text ?? part?.content ?? '')
    ?.join('') ?? ''
}

export function createAnthropicAdapter({ apiKey, model = 'claude-sonnet-5', fetchImpl, timeoutMs } = {}) {
  return {
    id: 'anthropic', configured: Boolean(apiKey),
    async invoke({ system, prompt, maxTokens = 2048 }) {
      if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured')
      const body = await requestJson('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: jsonHeaders(null, { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }),
        body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: prompt }] }),
      }, fetchImpl, timeoutMs)
      return { provider: 'anthropic', model, text: body.content?.map((item) => item.text ?? '').join('') ?? '', raw: body }
    },
  }
}

export function createOpenAIAdapter({ apiKey, model = 'gpt-5', fetchImpl, timeoutMs } = {}) {
  return {
    id: 'openai', configured: Boolean(apiKey),
    async invoke({ system, prompt, maxTokens = 2048 }) {
      if (!apiKey) throw new Error('OPENAI_API_KEY is not configured')
      const body = await requestJson('https://api.openai.com/v1/responses', {
        method: 'POST', headers: jsonHeaders(apiKey),
        body: JSON.stringify({ model, instructions: system, input: prompt, max_output_tokens: maxTokens }),
      }, fetchImpl, timeoutMs)
      return { provider: 'openai', model, text: responseText(body), raw: body }
    },
  }
}

export function createXAIAdapter({ apiKey, model = 'grok-4.6', fetchImpl, timeoutMs } = {}) {
  return {
    id: 'xai', configured: Boolean(apiKey),
    async invoke({ system, prompt, maxTokens = 2048 }) {
      if (!apiKey) throw new Error('XAI_API_KEY is not configured')
      const body = await requestJson('https://api.x.ai/v1/responses', {
        method: 'POST', headers: jsonHeaders(apiKey),
        body: JSON.stringify({ model, instructions: system, input: prompt, max_output_tokens: maxTokens }),
      }, fetchImpl, timeoutMs)
      return { provider: 'xai', model, text: responseText(body), raw: body }
    },
  }
}

export function createMetaLlamaAdapter({ apiKey, model = 'Llama-4-Maverick-17B-128E-Instruct-FP8', baseUrl = 'https://api.llama.com/compat/v1', fetchImpl, timeoutMs } = {}) {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '')
  return {
    id: 'meta-llama', configured: Boolean(apiKey),
    async invoke({ system, prompt, maxTokens = 2048 }) {
      if (!apiKey) throw new Error('LLAMA_API_KEY is not configured')
      const body = await requestJson(`${normalizedBaseUrl}/chat/completions`, {
        method: 'POST', headers: jsonHeaders(apiKey),
        body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }], max_tokens: maxTokens }),
      }, fetchImpl, timeoutMs)
      return { provider: 'meta-llama', model, text: body.choices?.[0]?.message?.content ?? '', raw: body }
    },
  }
}

export function createGeminiAdapter({ apiKey, model = 'gemini-3.7-flash', fetchImpl, timeoutMs } = {}) {
  return {
    id: 'gemini', configured: Boolean(apiKey),
    async invoke({ system, prompt, maxTokens = 2048 }) {
      if (!apiKey) throw new Error('GEMINI_API_KEY or GOOGLE_API_KEY is not configured')
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`
      const body = await requestJson(url, {
        method: 'POST', headers: jsonHeaders(null, { 'x-goog-api-key': apiKey }),
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: maxTokens },
        }),
      }, fetchImpl, timeoutMs)
      return { provider: 'gemini', model, text: body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '', raw: body }
    },
  }
}

export function createCloudflareWorkersAIAdapter({ accountId, apiToken, model = '@cf/meta/llama-3.1-8b-instruct', fetchImpl, timeoutMs } = {}) {
  return {
    id: 'cloudflare', configured: Boolean(accountId && apiToken),
    async invoke({ system, prompt, maxTokens = 2048 }) {
      if (!accountId || !apiToken) throw new Error('Cloudflare Workers AI credentials are not configured')
      const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${model}`
      const body = await requestJson(url, {
        method: 'POST', headers: jsonHeaders(apiToken),
        body: JSON.stringify({ messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }], max_tokens: maxTokens }),
      }, fetchImpl, timeoutMs)
      return { provider: 'cloudflare', model, text: body.result?.response ?? body.result?.result?.response ?? '', raw: body }
    },
  }
}

export function providersFromEnv(env = process.env) {
  const timeoutMs = Number(env.NEO_ROUTER_PROVIDER_TIMEOUT_MS || 30_000)
  const geminiApiKey = env.GOOGLE_API_KEY || env.GEMINI_API_KEY
  const gemini = geminiApiKey
    ? createGeminiAdapter({ apiKey: geminiApiKey, model: env.GEMINI_MODEL || undefined, timeoutMs })
    : createVertexGeminiAdapter({
        projectId: env.GOOGLE_CLOUD_PROJECT || env.GCP_PROJECT_ID,
        location: env.GOOGLE_CLOUD_LOCATION || env.GCP_REGION || 'us-central1',
        model: env.VERTEX_GEMINI_MODEL || env.GEMINI_MODEL || undefined,
        timeoutMs,
      })

  return [
    createAnthropicAdapter({ apiKey: env.ANTHROPIC_API_KEY, model: env.ANTHROPIC_MODEL || undefined, timeoutMs }),
    createOpenAIAdapter({ apiKey: env.OPENAI_API_KEY, model: env.OPENAI_MODEL || undefined, timeoutMs }),
    createXAIAdapter({ apiKey: env.XAI_API_KEY, model: env.XAI_MODEL || undefined, timeoutMs }),
    createMetaLlamaAdapter({ apiKey: env.LLAMA_API_KEY, model: env.LLAMA_MODEL || undefined, baseUrl: env.LLAMA_API_BASE || undefined, timeoutMs }),
    gemini,
    createCloudflareWorkersAIAdapter({ accountId: env.CLOUDFLARE_ACCOUNT_ID, apiToken: env.CLOUDFLARE_API_TOKEN, model: env.CLOUDFLARE_WORKERS_AI_MODEL || undefined, timeoutMs }),
  ]
}
