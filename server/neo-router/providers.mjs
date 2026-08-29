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

export function createAnthropicAdapter({ apiKey, model = 'claude-sonnet-5', fetchImpl, timeoutMs } = {}) {
  return {
    id: 'anthropic',
    configured: Boolean(apiKey),
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
    id: 'openai',
    configured: Boolean(apiKey),
    async invoke({ system, prompt, maxTokens = 2048 }) {
      if (!apiKey) throw new Error('OPENAI_API_KEY is not configured')
      const body = await requestJson('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: jsonHeaders(apiKey),
        body: JSON.stringify({ model, instructions: system, input: prompt, max_output_tokens: maxTokens }),
      }, fetchImpl, timeoutMs)
      return { provider: 'openai', model, text: body.output_text ?? '', raw: body }
    },
  }
}

export function createGeminiAdapter({ apiKey, model = 'gemini-3.1-pro-preview', fetchImpl, timeoutMs } = {}) {
  return {
    id: 'gemini',
    configured: Boolean(apiKey),
    async invoke({ system, prompt, maxTokens = 2048 }) {
      if (!apiKey) throw new Error('GEMINI_API_KEY or GOOGLE_API_KEY is not configured')
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`
      const body = await requestJson(url, {
        method: 'POST',
        headers: jsonHeaders(null, { 'x-goog-api-key': apiKey }),
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: maxTokens },
        }),
      }, fetchImpl, timeoutMs)
      const text = body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? ''
      return { provider: 'gemini', model, text, raw: body }
    },
  }
}

export function createCloudflareWorkersAIAdapter({ accountId, apiToken, model = '@cf/meta/llama-3.1-8b-instruct', fetchImpl, timeoutMs } = {}) {
  return {
    id: 'cloudflare',
    configured: Boolean(accountId && apiToken),
    async invoke({ system, prompt, maxTokens = 2048 }) {
      if (!accountId || !apiToken) throw new Error('Cloudflare Workers AI credentials are not configured')
      const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${model}`
      const body = await requestJson(url, {
        method: 'POST',
        headers: jsonHeaders(apiToken),
        body: JSON.stringify({
          messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
          max_tokens: maxTokens,
        }),
      }, fetchImpl, timeoutMs)
      const text = body.result?.response ?? body.result?.result?.response ?? ''
      return { provider: 'cloudflare', model, text, raw: body }
    },
  }
}

export function providersFromEnv(env = process.env) {
  const timeoutMs = Number(env.NEO_ROUTER_PROVIDER_TIMEOUT_MS || 30_000)
  return [
    createAnthropicAdapter({ apiKey: env.ANTHROPIC_API_KEY, model: env.ANTHROPIC_MODEL || undefined, timeoutMs }),
    createOpenAIAdapter({ apiKey: env.OPENAI_API_KEY, model: env.OPENAI_MODEL || undefined, timeoutMs }),
    createGeminiAdapter({ apiKey: env.GOOGLE_API_KEY || env.GEMINI_API_KEY, model: env.GEMINI_MODEL || undefined, timeoutMs }),
    createCloudflareWorkersAIAdapter({ accountId: env.CLOUDFLARE_ACCOUNT_ID, apiToken: env.CLOUDFLARE_API_TOKEN, model: env.CLOUDFLARE_WORKERS_AI_MODEL || undefined, timeoutMs }),
  ]
}
