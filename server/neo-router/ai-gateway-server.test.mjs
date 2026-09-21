import assert from 'node:assert/strict'
import test from 'node:test'
import { once } from 'node:events'
import { createNeoAiGatewayServer } from './ai-gateway-server.mjs'

async function request(server, path, options = {}) {
  const address = server.address()
  return fetch(`http://127.0.0.1:${address.port}${path}`, options)
}

async function withServer(factory, fn) {
  const server = factory()
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  try { await fn(server) } finally { server.close(); await once(server, 'close') }
}

const router = {
  health() {
    return { ok: true, configured: ['gemini'], providers: [{ id: 'gemini', configured: true }], capabilities: ['frontend'] }
  },
  async execute(mission, { approved }) {
    if (mission.actions.includes('publish') && !approved) return { status: 'awaiting_approval', missionId: mission.missionId }
    return {
      status: 'completed',
      route: mission.capability === 'personalization' ? 'meta-muse' : 'gemini',
      missionId: mission.missionId,
      result: { text: mission.objective, perspectiveContext: mission.perspectiveContext, previousResponseId: mission.previousResponseId },
    }
  },
}

const trusted = async () => ({ authenticated: true, trustBoundary: 'neo-gateway', subjectId: 'neo-user-1' })

test('health is public and exposes readiness without secrets', async () => {
  await withServer(() => createNeoAiGatewayServer({ router }), async (server) => {
    const response = await request(server, '/health')
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.equal(body.service, 'neo-ai-gateway')
    assert.deepEqual(body.router.configured, ['gemini'])
  })
})

test('provider inventory requires trusted NEO Gateway identity', async () => {
  await withServer(() => createNeoAiGatewayServer({ router }), async (server) => {
    assert.equal((await request(server, '/api/ai/providers')).status, 401)
  })

  await withServer(() => createNeoAiGatewayServer({ router, resolveTrustedIdentity: trusted }), async (server) => {
    const response = await request(server, '/api/ai/providers')
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.equal(body.subjectId, 'neo-user-1')
  })
})

test('execute normalizes a provider-neutral mission and preserves approval gates', async () => {
  await withServer(() => createNeoAiGatewayServer({ router, resolveTrustedIdentity: trusted }), async (server) => {
    const response = await request(server, '/api/ai/execute', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ objective: 'Enhance the dashboard', capability: 'frontend' }),
    })
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.equal(body.status, 'completed')
    assert.equal(body.route, 'gemini')
  })

  await withServer(() => createNeoAiGatewayServer({ router, resolveTrustedIdentity: trusted }), async (server) => {
    const response = await request(server, '/api/ai/execute', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ objective: 'Publish change', capability: 'frontend', actions: ['publish'] }),
    })
    assert.equal(response.status, 202)
    assert.equal((await response.json()).status, 'awaiting_approval')
  })
})

test('execute forwards perspectiveContext for personalized Muse missions', async () => {
  await withServer(() => createNeoAiGatewayServer({ router, resolveTrustedIdentity: trusted }), async (server) => {
    const response = await request(server, '/api/ai/execute', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        objective: 'Generate a NEO Society campaign concept',
        capability: 'personalization',
        perspectiveContext: 'Use the NEO perspective and preserve provenance.',
        previousResponseId: 'resp_previous_neo',
      }),
    })
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.equal(body.route, 'meta-muse')
    assert.match(body.result.perspectiveContext, /^Use the NEO perspective and preserve provenance\./)
    assert.match(body.result.perspectiveContext, /NEO KNOWLEDGE CONTEXT/)
    assert.equal(body.result.previousResponseId, 'resp_previous_neo')
  })
})

test('execute rejects malformed mission requests', async () => {
  await withServer(() => createNeoAiGatewayServer({ router, resolveTrustedIdentity: trusted }), async (server) => {
    const response = await request(server, '/api/ai/execute', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ capability: 'frontend' }),
    })
    assert.equal(response.status, 400)
    assert.equal((await response.json()).error, 'mission_fields_required')
  })
})


test('persistent thread APIs create, resume, rename, and append Muse turns', async () => {
  const rows = new Map()
  const store = {
    async createThread({ subjectId, title, capability }) {
      const thread = { id:'thread-1', subjectId, title, capability, lastResponseId:null, messages:[] }
      rows.set(thread.id, thread); return structuredClone(thread)
    },
    async listThreads({ subjectId }) { return [...rows.values()].filter(t=>t.subjectId===subjectId).map(t=>structuredClone(t)) },
    async getThread({ subjectId, threadId }) {
      const t=rows.get(threadId); if(!t)return null; if(t.subjectId!==subjectId)throw new Error('thread_forbidden'); return structuredClone(t)
    },
    async updateThread({ subjectId, threadId, title, pinned, archived }) {
      const t=await this.getThread({subjectId,threadId}); if(!t)return null;
      if(title!==undefined)t.title=title;if(typeof pinned==='boolean')t.pinned=pinned;if(typeof archived==='boolean')t.archived=archived;rows.set(threadId,t);return structuredClone(t)
    },
    async deleteThread({subjectId,threadId}){const t=await this.getThread({subjectId,threadId});if(!t)return false;rows.delete(threadId);return true},
    async appendTurn({ subjectId, threadId, objective, result }) {
      const t=await this.getThread({subjectId,threadId}); t.lastResponseId=result.responseId||'resp-thread'; t.messages.push({role:'user',text:objective},{role:'assistant',text:result.text,responseId:t.lastResponseId}); rows.set(threadId,t); return structuredClone(t)
    },
  }
  const threadRouter = {
    ...router,
    async execute(mission) {
      return { status:'completed', route:'meta-muse', missionId:mission.missionId, result:{ provider:'meta-muse', text:'thread answer', responseId:mission.previousResponseId ? 'resp-2' : 'resp-1' } }
    },
  }
  await withServer(() => createNeoAiGatewayServer({ router:threadRouter, resolveTrustedIdentity:trusted, conversationStore:store }), async server => {
    let response=await request(server,'/api/ai/threads',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title:'Temple Thread',capability:'personalization'})})
    assert.equal(response.status,201)
    response=await request(server,'/api/ai/execute',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({threadId:'thread-1',objective:'First turn',capability:'personalization'})})
    assert.equal(response.status,200)
    response=await request(server,'/api/ai/threads/thread-1')
    const loaded=await response.json()
    assert.equal(loaded.thread.lastResponseId,'resp-1')
    assert.equal(loaded.thread.messages.length,2)
    response=await request(server,'/api/ai/threads/thread-1',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({title:'Renamed',pinned:true,archived:true})})
    const patched=await response.json(); assert.equal(patched.thread.title,'Renamed'); assert.equal(patched.thread.pinned,true); assert.equal(patched.thread.archived,true)
    response=await request(server,'/api/ai/threads/thread-1/export'); const exported=await response.json(); assert.equal(exported.exportVersion,'neo-conversation-v1'); assert.equal(exported.thread.messages.length,2)
    response=await request(server,'/api/ai/threads'); assert.equal((await response.json()).threads.length,1)
    response=await request(server,'/api/ai/threads/thread-1',{method:'DELETE'}); assert.equal((await response.json()).deleted,true)
    assert.equal((await request(server,'/api/ai/threads/thread-1')).status,404)
  })
})

test('durable telemetry is overlaid on authenticated provider inventory', async () => {
  const providerTelemetryStore={async snapshot(ids){return Object.fromEntries(ids.map(id=>[id,{id,attempts:9,successes:8,failures:1}]))}}
  await withServer(() => createNeoAiGatewayServer({ router, resolveTrustedIdentity: trusted, providerTelemetryStore }), async server => {
    const response=await request(server,'/api/ai/providers'); assert.equal(response.status,200);
    const body=await response.json(); assert.equal(body.telemetryPersistence,'firestore'); assert.equal(body.providers[0].durableTelemetry.successes,8);
  })
})


test('returns explicit NEO knowledge provenance for personalized missions', async () => {
  await withServer(() => createNeoAiGatewayServer({ router, resolveTrustedIdentity: trusted }), async server => {
    const response = await request(server, '/api/ai/execute', {
      method: 'POST',
      headers: { 'content-type':'application/json' },
      body: JSON.stringify({ objective:'Explain Noology in the NEO context', capability:'personalization' }),
    })
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.ok(body.knowledge)
    assert.equal(body.knowledge.algo.missionId, body.missionId)
    assert.ok(Array.isArray(body.knowledge.provenance))
  })
})
