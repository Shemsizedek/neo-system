import http from 'node:http'
import { createNeoRouter } from '../neo-router/router.mjs'
import { providersFromEnv } from '../neo-router/providers.mjs'
import { createNeoPrimeRuntime } from './runtime.mjs'

const DEFAULT_ALLOWED_ORIGINS = Object.freeze([
  'https://shemsizedek.github.io',
  'https://holytemples.org',
  'https://www.holytemples.org',
])

function json(res, status, body, headers = {}) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...headers })
  res.end(JSON.stringify(body))
}

function corsHeaders(origin, allowedOrigins) {
  if (!origin || !allowedOrigins.has(origin)) return {}
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization,x-neo-prime-approval',
    vary: 'Origin',
  }
}

async function readJson(req, maxBytes = 64 * 1024) {
  let raw = ''
  for await (const chunk of req) {
    raw += chunk
    if (Buffer.byteLength(raw) > maxBytes) {
      const error = new Error('Request body too large')
      error.statusCode = 413
      throw error
    }
  }
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    const error = new Error('Invalid JSON body')
    error.statusCode = 400
    throw error
  }
}

function operatorAuthorized(req, token) {
  if (!token) return false
  const value = req.headers.authorization || ''
  return value === `Bearer ${token}`
}

function normalizeMission(body) {
  const objective = String(body.objective || body.command || '').trim()
  if (!objective) {
    const error = new Error('objective is required')
    error.statusCode = 400
    throw error
  }
  return {
    missionId: String(body.missionId || `prime-${Date.now()}`),
    objective,
    capability: String(body.capability || 'reasoning'),
    requestedAction: body.requestedAction || 'analyze',
    actions: Array.isArray(body.actions) ? body.actions : [],
    preferredProviders: Array.isArray(body.preferredProviders) ? body.preferredProviders : undefined,
    excludedProviders: Array.isArray(body.excludedProviders) ? body.excludedProviders : undefined,
    maxTokens: Number.isFinite(Number(body.maxTokens)) ? Number(body.maxTokens) : undefined,
    system: body.system,
  }
}

function responseText(result) {
  return result?.result?.text || result?.result?.output_text || result?.reason || result?.status || 'NEO Prime completed.'
}

export function createPrimeHttpServer({ env = process.env, providers, now = () => new Date().toISOString() } = {}) {
  const activeProviders = providers ?? providersFromEnv(env)
  const router = createNeoRouter({ providers: activeProviders })
  const prime = createNeoPrimeRuntime({ router })
  const operatorToken = env.NEO_PRIME_OPERATOR_TOKEN || ''
  const allowedOrigins = new Set(
    String(env.NEO_PRIME_ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS.join(','))
      .split(',').map((value) => value.trim()).filter(Boolean),
  )

  return http.createServer(async (req, res) => {
    const origin = req.headers.origin
    const cors = corsHeaders(origin, allowedOrigins)

    if (req.method === 'OPTIONS') {
      if (origin && !allowedOrigins.has(origin)) return json(res, 403, { ok: false, error: 'origin_not_allowed' })
      res.writeHead(204, cors)
      return res.end()
    }

    if (req.method === 'GET' && (req.url === '/health' || req.url === '/healthz')) {
      const health = router.health()
      return json(res, health.ok ? 200 : 503, {
        ok: health.ok,
        service: 'neo-prime-runtime',
        prime: 'active',
        guard: 'enforced',
        configuredProviders: health.configured,
        providers: health.providers,
        capabilities: health.capabilities,
        timestamp: now(),
      }, cors)
    }

    if (req.method === 'POST' && (req.url === '/api/prime' || req.url === '/prime')) {
      if (origin && !allowedOrigins.has(origin)) return json(res, 403, { ok: false, error: 'origin_not_allowed' })
      try {
        const body = await readJson(req)
        const mission = normalizeMission(body)
        const plan = prime.plan(mission, { cycle: body.cycle === 'angelic' ? 'angelic' : 'human' })
        const authorized = operatorAuthorized(req, operatorToken)
        const approved = body.approved === true && authorized && req.headers['x-neo-prime-approval'] === 'approved'

        if (plan.approvalRequired && !approved) {
          return json(res, 202, {
            ok: true,
            status: 'awaiting_approval',
            text: 'NEO Guard halted this command pending explicit operator authorization.',
            missionId: mission.missionId,
            approvalRequired: true,
            risk: plan.neoAlgo?.risk || 'yellow',
            candidates: plan.candidates,
            neoAlgo: plan.neoAlgo,
          }, cors)
        }

        const result = await prime.execute(mission, { approved, cycle: body.cycle === 'angelic' ? 'angelic' : 'human' })
        const status = result.status === 'completed' ? 200 : result.status === 'awaiting_approval' ? 202 : 503
        return json(res, status, {
          ok: result.status === 'completed',
          status: result.status,
          text: responseText(result),
          missionId: mission.missionId,
          route: result.route || null,
          approvalRequired: Boolean(result.approvalRequired),
          risk: result.neoAlgo?.risk || null,
          neoAlgo: result.neoAlgo,
          failures: result.failures || [],
        }, cors)
      } catch (error) {
        return json(res, error.statusCode || 500, {
          ok: false,
          error: error.statusCode ? 'bad_request' : 'prime_runtime_error',
          message: error instanceof Error ? error.message : String(error),
        }, cors)
      }
    }

    return json(res, 404, { ok: false, error: 'not_found' }, cors)
  })
}

export function startPrimeServer({ env = process.env } = {}) {
  const port = Number(env.PORT || env.NEO_PRIME_PORT || 8080)
  const server = createPrimeHttpServer({ env })
  server.listen(port, '0.0.0.0', () => {
    console.log(`[neo-prime] listening on :${port}`)
  })
  return server
}

if (import.meta.url === `file://${process.argv[1]}`) startPrimeServer()
