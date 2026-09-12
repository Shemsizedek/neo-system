import http from 'node:http'
import { randomUUID } from 'node:crypto'
import { createNeoRouter } from './router.mjs'
import { providersFromEnv } from './providers.mjs'

const MAX_BODY_BYTES = 64 * 1024

function respond(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  })
  res.end(payload)
}

function trustedSubject(identity) {
  const subjectId = identity?.subjectId
  if (identity?.trustBoundary !== 'neo-gateway' || !identity?.authenticated || typeof subjectId !== 'string' || !subjectId.trim()) {
    throw new Error('neopass_identity_required')
  }
  return subjectId.trim()
}

async function readJson(req, maxBytes = MAX_BODY_BYTES) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > maxBytes) throw new Error('request_too_large')
    chunks.push(chunk)
  }
  if (!chunks.length) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw new Error('invalid_json')
  }
}

function normalizeMission(body, subjectId) {
  const objective = typeof body.objective === 'string' ? body.objective.trim() : ''
  const capability = typeof body.capability === 'string' ? body.capability.trim() : ''
  if (!objective || !capability) throw new Error('mission_fields_required')

  return {
    missionId: typeof body.missionId === 'string' && body.missionId.trim() ? body.missionId.trim() : `NEO-AI-${randomUUID()}`,
    objective,
    capability,
    system: typeof body.system === 'string' && body.system.trim() ? body.system.trim() : undefined,
    maxTokens: Number.isFinite(body.maxTokens) ? Math.min(Math.max(Math.trunc(body.maxTokens), 1), 8192) : undefined,
    actions: Array.isArray(body.actions) ? body.actions.filter((value) => typeof value === 'string') : [],
    preferredProviders: Array.isArray(body.preferredProviders) ? body.preferredProviders.filter((value) => typeof value === 'string') : [],
    excludedProviders: Array.isArray(body.excludedProviders) ? body.excludedProviders.filter((value) => typeof value === 'string') : [],
    metadata: { subjectId },
  }
}

export function createNeoAiGatewayServer({
  resolveTrustedIdentity,
  env = process.env,
  router = createNeoRouter({ providers: providersFromEnv(env) }),
} = {}) {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://neo.local')

      if (req.method === 'GET' && url.pathname === '/health') {
        return respond(res, 200, {
          ok: true,
          service: 'neo-ai-gateway',
          router: router.health(),
        })
      }

      if (req.method === 'GET' && url.pathname === '/api/ai/providers') {
        if (typeof resolveTrustedIdentity !== 'function') return respond(res, 401, { error: 'neopass_identity_required' })
        const subjectId = trustedSubject(await resolveTrustedIdentity(req))
        return respond(res, 200, { subjectId, ...router.health() })
      }

      if (req.method === 'POST' && url.pathname === '/api/ai/execute') {
        if (typeof resolveTrustedIdentity !== 'function') return respond(res, 401, { error: 'neopass_identity_required' })
        const subjectId = trustedSubject(await resolveTrustedIdentity(req))
        const body = await readJson(req)
        const mission = normalizeMission(body, subjectId)
        const approved = body.approved === true
        const result = await router.execute(mission, { approved })
        const status = result.status === 'awaiting_approval' ? 202 : result.status === 'blocked' ? 503 : 200
        return respond(res, status, { subjectId, ...result })
      }

      return respond(res, 404, { error: 'not_found' })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message === 'neopass_identity_required') return respond(res, 401, { error: message })
      if (message === 'request_too_large') return respond(res, 413, { error: message })
      if (message === 'invalid_json' || message === 'mission_fields_required') return respond(res, 400, { error: message })
      if (message.includes('required')) return respond(res, 400, { error: 'mission_request_rejected' })
      return respond(res, 500, { error: 'neo_ai_gateway_error' })
    }
  })
}

export function startNeoAiGatewayServer({
  port = Number(process.env.PORT || process.env.NEO_AI_GATEWAY_PORT || 8801),
  host = process.env.HOST || '127.0.0.1',
  resolveTrustedIdentity,
  env = process.env,
} = {}) {
  return createNeoAiGatewayServer({ resolveTrustedIdentity, env }).listen(port, host)
}
