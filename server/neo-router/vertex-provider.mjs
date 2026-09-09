const METADATA_TOKEN_URL = 'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token'

async function accessToken(fetchImpl, explicitToken) {
  if (explicitToken) return explicitToken
  const response = await fetchImpl(METADATA_TOKEN_URL, {
    headers: { 'Metadata-Flavor': 'Google' },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok || !body.access_token) {
    const error = new Error(`Unable to obtain Google Cloud service-account token (${response.status})`)
    error.status = response.status
    throw error
  }
  return body.access_token
}

export function createVertexGeminiAdapter({
  projectId,
  location = 'us-central1',
  model = 'gemini-2.5-flash',
  accessToken: explicitToken,
  fetchImpl = fetch,
  timeoutMs = 30_000,
} = {}) {
  return {
    id: 'vertex',
    configured: Boolean(projectId && location),
    async invoke({ system, prompt, maxTokens = 2048 }) {
      if (!projectId || !location) throw new Error('Vertex AI project/location is not configured')
      const token = await accessToken(fetchImpl, explicitToken)
      const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/locations/${encodeURIComponent(location)}/publishers/google/models/${encodeURIComponent(model)}:generateContent`
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(new Error(`Vertex AI timed out after ${timeoutMs}ms`)), timeoutMs)
      let response
      try {
        response = await fetchImpl(endpoint, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: maxTokens },
          }),
        })
      } finally {
        clearTimeout(timeout)
      }
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        const error = new Error(`Vertex AI request failed (${response.status})`)
        error.status = response.status
        error.providerBody = body
        throw error
      }
      const text = body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? ''
      return { provider: 'vertex', model, text, raw: body }
    },
  }
}
