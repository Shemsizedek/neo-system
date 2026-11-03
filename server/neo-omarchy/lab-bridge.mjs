// NEO-OMARCHY-002: opt-in, localhost-only read-only AI lab bridge.
// Not a production agent gateway. No external commands, connectors or wallet access.
import { createServer } from 'node:http'
import { createHash, timingSafeEqual } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { createOllamaAdapter } from '../neo-router/ollama-provider.mjs'
import { createNeoRouter } from '../neo-router/router.mjs'
import { isLoopbackOllamaOrigin, runPreflight } from '../../scripts/neo-omarchy-preflight.mjs'

const MAX_BODY_BYTES = 4096
const TOKEN_RE = /^[a-f0-9]{64}$/i
const SUBJECT_RE = /^neo:agent:[a-z0-9][a-z0-9._-]{0,63}$/
const MISSION_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/

export function authorizeToken(header, expectedToken) {
  if (!TOKEN_RE.test(expectedToken || '') || typeof header !== 'string') return false
  if (!header.startsWith('Bearer ')) return false
  const supplied = header.slice(7)
  if (!TOKEN_RE.test(supplied)) return false
  const left = createHash('sha256').update(supplied).digest()
  const right = createHash('sha256').update(expectedToken).digest()
  return timingSafeEqual(left, right)
}

export function validateInferenceMission(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null
  const keys = Object.keys(payload)
  if (keys.some(k => !['missionId', 'subject', 'capability', 'objective', 'maxTokens'].includes(k))) return null
  if (typeof payload.missionId !== 'string' || !MISSION_RE.test(payload.missionId)) return null
  if (typeof payload.subject !== 'string' || !SUBJECT_RE.test(payload.subject)) return null
  if (payload.capability !== 'local-inference') return null
  if (typeof payload.objective !== 'string' || payload.objective.trim().length < 1 || payload.objective.length > 2000) return null
  const maxTokens = payload.maxTokens === undefined ? 256 : payload.maxTokens
  if (!Number.isInteger(maxTokens) || maxTokens < 1 || maxTokens > 512) return null
  return { missionId: payload.missionId, subject: payload.subject, capability: 'local-inference', objective: payload.objective, maxTokens }
}

function respond(res, status, data) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  })
  res.end(JSON.stringify(data))
}

async function readJson(req) {
  if (req.headers['content-type'] !== 'application/json') return { error: 'content-type' }
  let total = 0
  const chunks = []
  for await (const chunk of req) {
    total += chunk.length
    if (total > MAX_BODY_BYTES) return { error: 'too-large' }
    chunks.push(chunk)
  }
  try { return { value: JSON.parse(Buffer.concat(chunks).toString('utf8')) } }
  catch { return { error: 'invalid-json' } }
}

function isLocalClient(address) {
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1'
}

export function createLabHandler({ token, router, audit = () => {}, now = () => Date.now() } = {}) {
  if (!TOKEN_RE.test(token || '')) throw new Error('NEO_OMARCHY_LAB_TOKEN requires 64 hex characters')
  if (!router || typeof router.execute !== 'function') throw new Error('A configured local Router is required')
  let busy = false
  return async function handle(req, res) {
    if (!isLocalClient(req.socket?.remoteAddress)) return respond(res, 403, { error: 'local_only' })
    if (!authorizeToken(req.headers.authorization, token)) return respond(res, 401, { error: 'unauthorized' })
    if (req.method === 'GET' && req.url === '/v1/health') {
      return respond(res, 200, { gate: 'NEO-OMARCHY-002', status: 'lab-only', production: false })
    }
    if (req.method !== 'POST' || req.url !== '/v1/infer') return respond(res, 404, { error: 'not_found' })
    if (busy) return respond(res, 429, { error: 'lab_busy' })
    const body = await readJson(req)
    if (body.error) return respond(res, body.error === 'too-large' ? 413 : 400, { error: body.error })
    const mission = validateInferenceMission(body.value)
    if (!mission) return respond(res, 400, { error: 'invalid_or_unapproved_mission' })
    busy = true
    const started = now()
    let resultStatus = 'blocked'
    try {
      // Inputs contain no action, tools, system overrides or provider selection.
      const result = await router.execute({
        missionId: mission.missionId,
        objective: mission.objective,
        capability: 'local-inference',
        maxTokens: mission.maxTokens,
        actions: [],
      })
      if (result.status !== 'completed' || result.route !== 'ollama') {
        return respond(res, 503, { status: 'blocked', reason: 'local_model_unavailable' })
      }
      resultStatus = 'completed'
      return respond(res, 200, {
        missionId: mission.missionId, status: 'completed', route: 'ollama',
        model: result.result.model, text: result.result.text,
      })
    } catch {
      return respond(res, 503, { status: 'blocked', reason: 'local_model_unavailable' })
    } finally {
      busy = false
      try {
        audit({
          gate: 'NEO-OMARCHY-002',
          missionId: mission.missionId,
          subject: mission.subject,
          scope: 'local-inference',
          status: resultStatus,
          durationMs: Math.max(0, now() - started),
        })
      } catch {}
    }
  }
}

export function createLabServer(config) {
  const server = createServer(createLabHandler(config))
  server.headersTimeout = 10_000
  server.requestTimeout = 15_000
  return server
}

export function labConfigFromEnv(env = process.env) {
  if (env.NEO_OMARCHY_LAB_ENABLED !== '1') throw new Error('Lab is disabled: explicit opt-in required')
  if (!isLoopbackOllamaOrigin(env.OLLAMA_BASE_URL) || !env.OLLAMA_BASE_URL) {
    throw new Error('Ollama must use an explicit loopback HTTP(S) origin')
  }
  if (!TOKEN_RE.test(env.NEO_OMARCHY_LAB_TOKEN || '')) throw new Error('Lab token must be 64 hex characters')
  if (!env.OLLAMA_MODEL || !/^[a-zA-Z0-9._:/-]{1,128}$/.test(env.OLLAMA_MODEL)) {
    throw new Error('An explicitly reviewed local OLLAMA_MODEL is required')
  }
  return { token: env.NEO_OMARCHY_LAB_TOKEN, baseUrl: env.OLLAMA_BASE_URL, model: env.OLLAMA_MODEL }
}

export function createConfiguredLabServer(env = process.env) {
  const config = labConfigFromEnv(env)
  const preflight = runPreflight(env)
  if (preflight.status !== 'lab-preflight-passed') throw new Error('Omarchy host preflight did not pass')
  const provider = createOllamaAdapter({ baseUrl: config.baseUrl, model: config.model, timeoutMs: 30_000 })
  const router = createNeoRouter({ providers: [provider], routes: { 'local-inference': ['ollama'] }, maxHops: 1 })
  return createLabServer({
    token: config.token, router,
    audit: (event) => console.log(JSON.stringify({ ...event, recordedAt: new Date().toISOString() })),
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const server = createConfiguredLabServer()
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      console.log(JSON.stringify({ gate: 'NEO-OMARCHY-002', status: 'local-lab-active', host: '127.0.0.1', port, production: false }))
    })
  } catch {
    console.error('NEO Omarchy lab is disabled or does not meet preflight requirements')
    process.exitCode = 1
  }
}
