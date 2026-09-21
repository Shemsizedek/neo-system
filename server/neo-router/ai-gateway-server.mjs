import http from 'node:http'
import { randomUUID } from 'node:crypto'
import { createNeoRouter } from './router.mjs'
import { providersFromEnv } from './providers.mjs'
import { buildKnowledgeContext } from './knowledge-context.mjs'

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
    perspectiveContext: typeof body.perspectiveContext === 'string' && body.perspectiveContext.trim() ? body.perspectiveContext.trim() : undefined,
    previousResponseId: typeof body.previousResponseId === 'string' && body.previousResponseId.trim() ? body.previousResponseId.trim() : undefined,
    maxTokens: Number.isFinite(body.maxTokens) ? Math.min(Math.max(Math.trunc(body.maxTokens), 1), 8192) : undefined,
    actions: Array.isArray(body.actions) ? body.actions.filter((value) => typeof value === 'string') : [],
    preferredProviders: Array.isArray(body.preferredProviders) ? body.preferredProviders.filter((value) => typeof value === 'string') : [],
    excludedProviders: Array.isArray(body.excludedProviders) ? body.excludedProviders.filter((value) => typeof value === 'string') : [],
    threadId: typeof body.threadId === 'string' && body.threadId.trim() ? body.threadId.trim() : undefined,
    knowledgeAttachments: Array.isArray(body.knowledgeAttachments) ? body.knowledgeAttachments.filter(value => typeof value === 'string').slice(0, 8) : [],
    autoKnowledge: body.autoKnowledge !== false,
    metadata: { subjectId },
  }
}

export function createNeoAiGatewayServer({
  resolveTrustedIdentity,
  env = process.env,
  router = createNeoRouter({ providers: providersFromEnv(env) }),
  conversationStore,
  providerTelemetryStore,
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

      if (url.pathname === '/api/ai/threads' && req.method === 'GET') {
        if (typeof resolveTrustedIdentity !== 'function') return respond(res, 401, { error: 'neopass_identity_required' })
        const subjectId = trustedSubject(await resolveTrustedIdentity(req))
        if (!conversationStore) return respond(res, 503, { error: 'conversation_store_unavailable' })
        const includeArchived = url.searchParams.get('includeArchived') !== 'false'
        const threads = await conversationStore.listThreads({ subjectId, includeArchived })
        return respond(res, 200, { subjectId, threads })
      }

      if (url.pathname === '/api/ai/threads' && req.method === 'POST') {
        if (typeof resolveTrustedIdentity !== 'function') return respond(res, 401, { error: 'neopass_identity_required' })
        const subjectId = trustedSubject(await resolveTrustedIdentity(req))
        if (!conversationStore) return respond(res, 503, { error: 'conversation_store_unavailable' })
        const body = await readJson(req)
        const thread = await conversationStore.createThread({ subjectId, title: body.title, capability: body.capability })
        return respond(res, 201, { subjectId, thread })
      }

      const threadExportMatch = url.pathname.match(/^\/api\/ai\/threads\/([^/]+)\/export$/)
      if (threadExportMatch && req.method === 'GET') {
        if (typeof resolveTrustedIdentity !== 'function') return respond(res, 401, { error: 'neopass_identity_required' })
        const subjectId = trustedSubject(await resolveTrustedIdentity(req))
        if (!conversationStore) return respond(res, 503, { error: 'conversation_store_unavailable' })
        const thread = await conversationStore.getThread({ subjectId, threadId: decodeURIComponent(threadExportMatch[1]) })
        if (!thread) return respond(res, 404, { error: 'thread_not_found' })
        return respond(res, 200, {
          exportVersion: 'neo-conversation-v1',
          exportedAt: new Date().toISOString(),
          thread,
        })
      }

      const threadMatch = url.pathname.match(/^\/api\/ai\/threads\/([^/]+)$/)
      if (threadMatch && req.method === 'GET') {
        if (typeof resolveTrustedIdentity !== 'function') return respond(res, 401, { error: 'neopass_identity_required' })
        const subjectId = trustedSubject(await resolveTrustedIdentity(req))
        if (!conversationStore) return respond(res, 503, { error: 'conversation_store_unavailable' })
        const thread = await conversationStore.getThread({ subjectId, threadId: decodeURIComponent(threadMatch[1]) })
        if (!thread) return respond(res, 404, { error: 'thread_not_found' })
        return respond(res, 200, { subjectId, thread })
      }

      if (threadMatch && req.method === 'PATCH') {
        if (typeof resolveTrustedIdentity !== 'function') return respond(res, 401, { error: 'neopass_identity_required' })
        const subjectId = trustedSubject(await resolveTrustedIdentity(req))
        if (!conversationStore) return respond(res, 503, { error: 'conversation_store_unavailable' })
        const body = await readJson(req)
        const thread = await conversationStore.updateThread({
          subjectId,
          threadId: decodeURIComponent(threadMatch[1]),
          title: body.title,
          pinned: body.pinned,
          archived: body.archived,
          knowledgeAttachments: body.knowledgeAttachments,
        })
        if (!thread) return respond(res, 404, { error: 'thread_not_found' })
        return respond(res, 200, { subjectId, thread })
      }

      if (threadMatch && req.method === 'DELETE') {
        if (typeof resolveTrustedIdentity !== 'function') return respond(res, 401, { error: 'neopass_identity_required' })
        const subjectId = trustedSubject(await resolveTrustedIdentity(req))
        if (!conversationStore) return respond(res, 503, { error: 'conversation_store_unavailable' })
        const deleted = await conversationStore.deleteThread({ subjectId, threadId: decodeURIComponent(threadMatch[1]) })
        if (!deleted) return respond(res, 404, { error: 'thread_not_found' })
        return respond(res, 200, { subjectId, deleted: true })
      }

      if (req.method === 'GET' && url.pathname === '/api/ai/providers') {
        if (typeof resolveTrustedIdentity !== 'function') return respond(res, 401, { error: 'neopass_identity_required' })
        const subjectId = trustedSubject(await resolveTrustedIdentity(req))
        const health = router.health()
        const durableTelemetry = providerTelemetryStore
          ? await providerTelemetryStore.snapshot(health.providers.map(provider => provider.id))
          : {}
        const providers = health.providers.map(provider => ({
          ...provider,
          durableTelemetry: durableTelemetry[provider.id] ?? null,
        }))
        return respond(res, 200, { subjectId, ...health, providers, telemetryPersistence: providerTelemetryStore ? 'firestore' : 'memory' })
      }

      if (req.method === 'POST' && url.pathname === '/api/ai/execute') {
        if (typeof resolveTrustedIdentity !== 'function') return respond(res, 401, { error: 'neopass_identity_required' })
        const subjectId = trustedSubject(await resolveTrustedIdentity(req))
        const body = await readJson(req)
        const mission = normalizeMission(body, subjectId)
        let thread = null
        if (mission.threadId) {
          if (!conversationStore) return respond(res, 503, { error: 'conversation_store_unavailable' })
          thread = await conversationStore.getThread({ subjectId, threadId: mission.threadId })
          if (!thread) return respond(res, 404, { error: 'thread_not_found' })
          if (!mission.previousResponseId && thread.lastResponseId) mission.previousResponseId = thread.lastResponseId
          if (!mission.knowledgeAttachments.length && Array.isArray(thread.knowledgeAttachments)) mission.knowledgeAttachments = thread.knowledgeAttachments
        }
        const knowledge = mission.autoKnowledge
          ? buildKnowledgeContext({
              objective: mission.objective,
              attachments: mission.knowledgeAttachments,
              missionId: mission.missionId,
              accessClass: 'PUBLIC_WORLD_LIBRARY',
            })
          : { context: '', provenance: [], attachedIds: mission.knowledgeAttachments, autoRetrievedIds: [], algo: null }
        if (knowledge.context) {
          mission.perspectiveContext = [mission.perspectiveContext, knowledge.context].filter(Boolean).join('\n\n')
        }
        const approved = body.approved === true
        const result = await router.execute(mission, { approved })
        if (mission.threadId && result.status === 'completed') {
          await conversationStore.appendTurn({
            subjectId,
            threadId: mission.threadId,
            objective: mission.objective,
            capability: mission.capability,
            result: result.result,
          })
        }
        const status = result.status === 'awaiting_approval' ? 202 : result.status === 'blocked' ? 503 : 200
        return respond(res, status, { subjectId, ...result, knowledge: { provenance: knowledge.provenance, attachedIds: knowledge.attachedIds, autoRetrievedIds: knowledge.autoRetrievedIds, algo: knowledge.algo } })
      }

      return respond(res, 404, { error: 'not_found' })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message === 'neopass_identity_required') return respond(res, 401, { error: message })
      if (message === 'request_too_large') return respond(res, 413, { error: message })
      if (message === 'thread_forbidden') return respond(res, 403, { error: message })
      if (message === 'thread_not_found') return respond(res, 404, { error: message })
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
