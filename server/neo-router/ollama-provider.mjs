// Ollama native API: https://github.com/ollama/ollama/blob/main/docs/api.md
export function createOllamaAdapter({ baseUrl, model, fetchImpl = fetch, timeoutMs = 30_000 } = {}) {
  let endpoint
  if (baseUrl) {
    const url = new URL(baseUrl)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
      throw new TypeError('OLLAMA_BASE_URL must be an HTTP(S) origin without credentials, path, query or fragment')
    }
    endpoint = new URL('/api/chat', url).href
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new TypeError('Ollama timeout must be positive')
  return {
    id: 'ollama',
    configured: Boolean(endpoint && typeof model === 'string' && model.trim()),
    async invoke({ system = '', prompt, maxTokens = 2048 } = {}) {
      if (!endpoint || typeof model !== 'string' || !model.trim()) throw new Error('OLLAMA_BASE_URL and OLLAMA_MODEL are required')
      if (typeof prompt !== 'string' || !prompt.trim()) throw new TypeError('prompt is required')
      if (!Number.isInteger(maxTokens) || maxTokens < 1 || maxTokens > 32768) throw new TypeError('maxTokens must be between 1 and 32768')
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)
      try {
        const response = await fetchImpl(endpoint, {
          method: 'POST', redirect: 'error', signal: controller.signal,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            model, stream: false,
            messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
            options: { num_predict: maxTokens },
          }),
        })
        if (!response.ok) throw new Error(`Ollama request failed (${response.status})`)
        const body = await response.json()
        if (body.error || body.done !== true || typeof body.message?.content !== 'string' || !body.message.content.trim()) {
          throw new Error('Ollama returned an invalid or incomplete response')
        }
        return { provider: 'ollama', model, text: body.message.content }
      } finally { clearTimeout(timer) }
    },
  }
}
