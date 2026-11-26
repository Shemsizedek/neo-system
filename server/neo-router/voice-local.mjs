import http from 'node:http'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { createCommunicationEnvelope } from './communication-fabric.mjs'

const roles = {
  sales: 'Ask about property or business opportunities, addresses, terms and owner goals. Never promise rent, returns or financing.',
  donation: 'Handle sponsorship inquiries. No tax status claims, payment links or donation collection without verified records.',
  operations: 'Help with reception, meeting options and upkeep. Never say a meeting is booked or a bill paid.'
}
const system = 'You are a disclosed NEO AI assistant representing Larry Shelton. Be concise and truthful. You have no tools, phone connection, calendar or payment authority. Never claim external actions occurred. Do not impersonate Larry. Ask for facts rather than invent them.'

export function localOrigin(value) {
  const u = new URL(value)
  if (u.protocol !== 'http:' || !['127.0.0.1', '[::1]'].includes(u.hostname) ||
      u.username || u.password || u.pathname !== '/' || u.search || u.hash) {
    throw new Error('Only literal loopback HTTP service origins are allowed')
  }
  return u.origin
}

async function jsonResponse(response) {
  if (!response.ok) throw new Error('Local model service unavailable')
  // Models are trusted local services; client response sizes are bounded separately.
  return response.json()
}

export function createLocalModels({ model, ollama = 'http://127.0.0.1:11434',
  whisper = 'http://127.0.0.1:8080', fetchImpl = fetch } = {}) {
  const llm = localOrigin(ollama), stt = localOrigin(whisper)
  async function request(url, options = {}) {
    return fetchImpl(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(45000) })
  }
  return {
    async ready() {
      if (!model || /cloud/i.test(model)) return { ready: false, reason: 'Select an installed local Ollama model' }
      try {
        const tags = await jsonResponse(await request(llm + '/api/tags'))
        const present = tags.models?.some(m => m.name === model || m.model === model)
        return { ready: Boolean(present), reason: present ? null : 'Configured model is not installed' }
      } catch { return { ready: false, reason: 'Local Ollama is unavailable' } }
    },
    async chat(role, text) {
      if (!Object.hasOwn(roles, role)) throw new Error('Unknown role')
      if (!(await this.ready()).ready) throw new Error('Local model not ready')
      const result = await jsonResponse(await request(llm + '/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, stream: false, messages: [
          { role: 'system', content: system + ' ' + roles[role] },
          { role: 'user', content: text }
        ], options: { num_predict: 256, num_ctx: 2048 } })
      }))
      const reply = result.message?.content
      if (typeof reply !== 'string' || !reply.trim()) throw new Error('Empty local model reply')
      return reply.slice(0, 6000)
    },
    async transcribe(wav) {
      const form = new FormData()
      form.set('file', new Blob([wav], { type: 'audio/wav' }), 'speech.wav')
      form.set('response_format', 'json')
      const result = await jsonResponse(await request(stt + '/inference', { method: 'POST', body: form }))
      if (typeof result.text !== 'string' || !result.text.trim()) throw new Error('No speech transcribed')
      return result.text.slice(0, 4000)
    }
  }
}

async function body(req, max) {
  const chunks = []; let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > max) throw Object.assign(new Error('Request too large'), { status: 413 })
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

export function createVoiceServer({ models = createLocalModels({ model: process.env.NEO_VOICE_MODEL }),
  htmlPath = new URL('./voice-local.html', import.meta.url) } = {}) {
  let busy = false
  const server = http.createServer(async (req, res) => {
    const host = req.headers.host
    const port = server.address()?.port
    const permittedHosts = [`127.0.0.1:${port}`, `localhost:${port}`]
    const send = (status, value) => {
      res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      res.end(JSON.stringify(value))
    }
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Referrer-Policy', 'no-referrer')
    res.setHeader('X-Frame-Options', 'DENY')
    if (!permittedHosts.includes(host)) return send(403, { error: 'Invalid host' })
    if (req.headers.origin && req.headers.origin !== `http://${host}`) return send(403, { error: 'Invalid origin' })
    if (req.method === 'GET' && req.url === '/health') {
      return send(200, { transport: 'local-browser', phone_connected: false, paid_api_enabled: false,
        readiness: await models.ready() })
    }
    if (req.method === 'GET' && req.url === '/') {
      try {
        res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; form-action 'self'")
        res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' })
        return res.end(await readFile(htmlPath))
      } catch { return send(500, { error: 'UI unavailable' }) }
    }
    if (req.method === 'GET' && req.url === '/client.js') {
      res.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-store' })
      return res.end(await readFile(new URL('./voice-local-client.js', import.meta.url)))
    }
    if (req.method !== 'POST' || !['/chat', '/transcribe'].includes(req.url)) return send(404, { error: 'Not found' })
    // Browser-only gate prevents cross-origin form submissions; no public remote access.
    if (req.headers['x-neo-local'] !== '1') return send(403, { error: 'Local client header required' })
    if (busy) return send(429, { error: 'One turn at a time; please wait' })
    busy = true
    try {
      if (req.url === '/chat') {
        if (req.headers['content-type'] !== 'application/json') return send(415, { error: 'JSON required' })
        let input
        try { input = JSON.parse((await body(req, 24000)).toString()) }
        catch (e) { if (e.status) throw e; return send(400, { error: 'Invalid JSON' }) }
        if (!Object.hasOwn(roles, input?.role) || typeof input?.text !== 'string' ||
            !input.text.trim() || input.text.length > 4000) return send(400, { error: 'Invalid role or text' })
        const reply = await models.chat(input.role, input.text)
        // Reuse NEO Router envelope shape. No conversation contents persisted or emitted.
        const event = createCommunicationEnvelope({ source: 'NEO-VOICE-LOCAL',
          eventType: 'VOICE_LOCAL_TURN', sensitivity: 'INTERNAL',
          payload: { role: input.role, transport: 'local-browser', external_action: false } })
        return send(200, { reply, event })
      }
      if (req.headers['content-type'] !== 'audio/wav') return send(415, { error: 'WAV required' })
      const wav = await body(req, 2_000_000)
      if (wav.length < 44 || wav.toString('ascii', 0, 4) !== 'RIFF' ||
          wav.toString('ascii', 8, 12) !== 'WAVE') return send(400, { error: 'Invalid WAV header' })
      return send(200, { text: await models.transcribe(wav) })
    } catch (error) {
      return send(error.status || 503, { error: error.status ? error.message : 'Local service unavailable; no paid fallback attempted' })
    } finally { busy = false }
  })
  server.requestTimeout = 60000
  server.headersTimeout = 10000
  return server
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createVoiceServer().listen(8794, '127.0.0.1', () => console.log('NEO local voice prototype: http://127.0.0.1:8794'))
}
