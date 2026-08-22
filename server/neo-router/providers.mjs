const jsonHeaders = (apiKey, extra = {}) => ({
  'content-type': 'application/json',
  ...extra,
  ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
})

async function requestJson(url, options, fetchImpl = fetch) {
  const response = await fetchImpl(url, options)
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(`Provider request failed (${response.status})`)
    error.status = response.status
    error.providerBody = body
    throw error
  }
  return body
}

export function createAnthropicAdapter({ apiKey, model = 'claude-sonnet-4-5', fetchImpl } = {}) {
  return {
    id: 'anthropic',
    configured: Boolean(apiKey),
    async invoke({ system, prompt, maxTokens = 2048 }) {
      if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured')
      const body = await requestJson('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: jsonHeaders(null, { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }),
        body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: prompt }] }),
      }, fetchImpl)
      return { provider: 'anthropic', model, text: body.content?.map((item) => item.text ?? '').join('') ?? '', raw: body }
    },
  }
}

export function createOpenAIAdapter({ apiKey, model = 'gpt-5', fetchImpl } = {}) {
  return {
    id: 'openai',
    configured: Boolean(apiKey),
    async invoke({ system, prompt, maxTokens = 2048 }) {
      if (!apiKey) throw new Error('OPENAI_API_KEY is not configured')
      const body = await requestJson('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: jsonHeaders(apiKey),
        body: JSON.stringify({ model, instructions: system, input: prompt, max_output_tokens: maxTokens }),
      }, fetchImpl)
      return { provider: 'openai', model, text: body.output_text ?? '', raw: body }
    },
  }
}

export function createGeminiAdapter({ apiKey, model = 'gemini-2.5-pro', fetchImpl } = {}) {
  return {
    id: 'gemini',
    configured: Boolean(apiKey),
    async invoke({ system, prompt, maxTokens = 2048 }) {
      if (!apiKey) throw new Error('GEMINI_API_KEY is not configured')
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`
      const body = await requestJson(url, {
        method: 'POST',
        headers: jsonHeaders(null),
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: maxTokens },
        }),
      }, fetchImpl)
      const text = body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? ''
      return { provider: 'gemini', model, text, raw: body }
    },
  }
}

export function providersFromEnv(env = process.env) {
  return [
    createAnthropicAdapter({ apiKey: env.ANTHROPIC_API_KEY }),
    createOpenAIAdapter({ apiKey: env.OPENAI_API_KEY }),
    createGeminiAdapter({ apiKey: env.GEMINI_API_KEY }),
  ]
}
