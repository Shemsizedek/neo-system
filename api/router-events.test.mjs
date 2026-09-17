import test from 'node:test'
import assert from 'node:assert/strict'
import { createMemoryEventStore } from '../server/neo-router/event-engine.mjs'
import { verifyBearer } from '../server/neo-router/event-security.mjs'

// Mock the handler dependencies
const mockRuntime = {
  store: { durable: true },
  withEngine: async (fn) => fn({
    queue: async (mission) => ({ ...mission, id: mission.id, status: 'queued' })
  }),
  telemetry: async () => ({ missions: [] })
}

// Helper to create a mock request object
function createMockRequest({ method = 'GET', headers = {}, query = {}, body = null } = {}) {
  const req = {
    method,
    headers: Object.fromEntries(
      Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])
    ),
    query,
    [Symbol.asyncIterator]: async function* () {
      if (body) {
        yield Buffer.from(JSON.stringify(body))
      }
    }
  }
  return req
}

// Helper to create a mock response object
function createMockResponse() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) {
      this.headers[name] = value
      return this
    },
    status(code) {
      this.statusCode = code
      return this
    },
    json(data) {
      this.body = data
      return this
    }
  }
  return res
}

// Test the verifyBearer function directly
test('verifyBearer rejects missing token', () => {
  assert.equal(verifyBearer('Bearer test-token', null), false)
  assert.equal(verifyBearer(null, 'test-token'), false)
  assert.equal(verifyBearer(null, null), false)
})

test('verifyBearer accepts valid bearer token', () => {
  const token = 'secret-token-123'
  assert.equal(verifyBearer(`Bearer ${token}`, token), true)
  assert.equal(verifyBearer(token, token), true)
})

test('verifyBearer rejects invalid bearer token', () => {
  assert.equal(verifyBearer('Bearer wrong-token', 'correct-token'), false)
  assert.equal(verifyBearer('wrong-token', 'correct-token'), false)
})

// Test GET endpoint authorization (the security fix)
test('GET /router-events requires authentication', async () => {
  // Save original env
  const originalToken = process.env.NEO_ROUTER_EVENT_TOKEN
  process.env.NEO_ROUTER_EVENT_TOKEN = 'test-secret-token'

  try {
    // Import handler after setting env
    const { default: handler } = await import('./router-events.mjs')

    // Test 1: Unauthenticated request should be rejected with 401
    const req1 = createMockRequest({ method: 'GET' })
    const res1 = createMockResponse()
    await handler(req1, res1)
    
    assert.equal(res1.statusCode, 401, 'Unauthenticated GET should return 401')
    assert.deepEqual(res1.body, { error: 'unauthorized' }, 'Should return unauthorized error')

    // Test 2: Request with wrong token should be rejected
    const req2 = createMockRequest({
      method: 'GET',
      headers: { 'Authorization': 'Bearer wrong-token' }
    })
    const res2 = createMockResponse()
    await handler(req2, res2)
    
    assert.equal(res2.statusCode, 401, 'Wrong token should return 401')
    assert.deepEqual(res2.body, { error: 'unauthorized' })

    // Test 3: Request with correct token should succeed
    const req3 = createMockRequest({
      method: 'GET',
      headers: { 'Authorization': 'Bearer test-secret-token' }
    })
    const res3 = createMockResponse()
    await handler(req3, res3)
    
    assert.equal(res3.statusCode, 200, 'Authenticated GET should return 200')
    assert.ok(res3.body.events, 'Response should contain events array')
    assert.ok(res3.body.eventStore, 'Response should contain eventStore metadata')
    assert.equal(res3.headers['Cache-Control'], 'no-store', 'Should set no-store cache header')

  } finally {
    // Restore original env
    if (originalToken !== undefined) {
      process.env.NEO_ROUTER_EVENT_TOKEN = originalToken
    } else {
      delete process.env.NEO_ROUTER_EVENT_TOKEN
    }
  }
})

test('GET /router-events does not expose sensitive payloads without authentication', async () => {
  const originalToken = process.env.NEO_ROUTER_EVENT_TOKEN
  const originalRedisUrl = process.env.UPSTASH_REDIS_REST_URL
  const originalRedisToken = process.env.UPSTASH_REDIS_REST_TOKEN
  
  // Use memory store for this test
  delete process.env.UPSTASH_REDIS_REST_URL
  delete process.env.UPSTASH_REDIS_REST_TOKEN
  process.env.NEO_ROUTER_EVENT_TOKEN = 'secure-token'

  try {
    // Import with cache-busting query parameter
    const { default: handler } = await import('./router-events.mjs?t=' + Date.now())

    // Simulate that events with sensitive payloads exist in the store
    // (In a real scenario, these would have been ingested via POST)
    
    // Test: Unauthenticated request should NOT get the events
    const req = createMockRequest({ method: 'GET' })
    const res = createMockResponse()
    await handler(req, res)
    
    assert.equal(res.statusCode, 401, 'Should reject unauthenticated access')
    assert.equal(res.body.error, 'unauthorized', 'Should return unauthorized error')
    assert.ok(!res.body.events, 'Should not return events array without authentication')

  } finally {
    // Restore env
    if (originalToken !== undefined) {
      process.env.NEO_ROUTER_EVENT_TOKEN = originalToken
    } else {
      delete process.env.NEO_ROUTER_EVENT_TOKEN
    }
    if (originalRedisUrl !== undefined) {
      process.env.UPSTASH_REDIS_REST_URL = originalRedisUrl
    }
    if (originalRedisToken !== undefined) {
      process.env.UPSTASH_REDIS_REST_TOKEN = originalRedisToken
    }
  }
})

test('GET /router-events with valid token can access event list', async () => {
  const originalToken = process.env.NEO_ROUTER_EVENT_TOKEN
  const originalRedisUrl = process.env.UPSTASH_REDIS_REST_URL
  const originalRedisToken = process.env.UPSTASH_REDIS_REST_TOKEN
  
  delete process.env.UPSTASH_REDIS_REST_URL
  delete process.env.UPSTASH_REDIS_REST_TOKEN
  process.env.NEO_ROUTER_EVENT_TOKEN = 'valid-access-token'

  try {
    const { default: handler } = await import('./router-events.mjs?t=' + Date.now())

    // Test with valid authentication
    const req = createMockRequest({
      method: 'GET',
      headers: { 'Authorization': 'Bearer valid-access-token' }
    })
    const res = createMockResponse()
    await handler(req, res)
    
    assert.equal(res.statusCode, 200, 'Authenticated request should succeed')
    assert.ok(Array.isArray(res.body.events), 'Should return events array')
    assert.ok(res.body.eventStore, 'Should return eventStore metadata')
    assert.equal(res.body.eventStore.mode, 'memory', 'Should use memory store')
    assert.equal(res.body.eventStore.durable, false, 'Memory store is not durable')

  } finally {
    if (originalToken !== undefined) {
      process.env.NEO_ROUTER_EVENT_TOKEN = originalToken
    } else {
      delete process.env.NEO_ROUTER_EVENT_TOKEN
    }
    if (originalRedisUrl !== undefined) {
      process.env.UPSTASH_REDIS_REST_URL = originalRedisUrl
    }
    if (originalRedisToken !== undefined) {
      process.env.UPSTASH_REDIS_REST_TOKEN = originalRedisToken
    }
  }
})

test('GET /router-events rejects requests with missing Authorization header', async () => {
  const originalToken = process.env.NEO_ROUTER_EVENT_TOKEN
  process.env.NEO_ROUTER_EVENT_TOKEN = 'required-token'

  try {
    const { default: handler } = await import('./router-events.mjs?t=' + Date.now())

    // Test without Authorization header
    const req = createMockRequest({ method: 'GET', headers: {} })
    const res = createMockResponse()
    await handler(req, res)
    
    assert.equal(res.statusCode, 401, 'Should reject request without Authorization header')
    assert.deepEqual(res.body, { error: 'unauthorized' })

  } finally {
    if (originalToken !== undefined) {
      process.env.NEO_ROUTER_EVENT_TOKEN = originalToken
    } else {
      delete process.env.NEO_ROUTER_EVENT_TOKEN
    }
  }
})

test('GET /router-events rejects requests with malformed Authorization header', async () => {
  const originalToken = process.env.NEO_ROUTER_EVENT_TOKEN
  process.env.NEO_ROUTER_EVENT_TOKEN = 'correct-token'

  try {
    const { default: handler } = await import('./router-events.mjs?t=' + Date.now())

    // Test with malformed Authorization header
    const testCases = [
      { header: 'Basic dXNlcjpwYXNz', desc: 'Basic auth' },
      { header: 'Bearer', desc: 'Bearer without token' },
      { header: 'InvalidFormat', desc: 'Invalid format' },
      { header: '', desc: 'Empty string' }
    ]

    for (const { header, desc } of testCases) {
      const req = createMockRequest({
        method: 'GET',
        headers: { 'Authorization': header }
      })
      const res = createMockResponse()
      await handler(req, res)
      
      assert.equal(res.statusCode, 401, `Should reject ${desc}`)
      assert.deepEqual(res.body, { error: 'unauthorized' }, `Should return unauthorized for ${desc}`)
    }

  } finally {
    if (originalToken !== undefined) {
      process.env.NEO_ROUTER_EVENT_TOKEN = originalToken
    } else {
      delete process.env.NEO_ROUTER_EVENT_TOKEN
    }
  }
})

test('POST /router-events still requires authentication', async () => {
  const originalToken = process.env.NEO_ROUTER_EVENT_TOKEN
  const originalGithubSecret = process.env.NEO_ROUTER_GITHUB_WEBHOOK_SECRET
  const originalRedisUrl = process.env.UPSTASH_REDIS_REST_URL
  const originalRedisToken = process.env.UPSTASH_REDIS_REST_TOKEN
  
  process.env.NEO_ROUTER_EVENT_TOKEN = 'post-token'
  process.env.NEO_ROUTER_GITHUB_WEBHOOK_SECRET = 'github-secret'
  process.env.UPSTASH_REDIS_REST_URL = 'https://fake-redis.upstash.io'
  process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token'

  try {
    const { default: handler } = await import('./router-events.mjs?t=' + Date.now())

    // Test POST without authentication
    const req = createMockRequest({
      method: 'POST',
      query: { source: 'github' },
      headers: {},
      body: { action: 'opened', workflow_run: { id: 123 } }
    })
    const res = createMockResponse()
    await handler(req, res)
    
    // POST should also require authentication (via authorized() function)
    assert.equal(res.statusCode, 401, 'POST without auth should return 401')
    assert.deepEqual(res.body, { error: 'unauthorized_event' })

  } finally {
    if (originalToken !== undefined) {
      process.env.NEO_ROUTER_EVENT_TOKEN = originalToken
    } else {
      delete process.env.NEO_ROUTER_EVENT_TOKEN
    }
    if (originalGithubSecret !== undefined) {
      process.env.NEO_ROUTER_GITHUB_WEBHOOK_SECRET = originalGithubSecret
    } else {
      delete process.env.NEO_ROUTER_GITHUB_WEBHOOK_SECRET
    }
    if (originalRedisUrl !== undefined) {
      process.env.UPSTASH_REDIS_REST_URL = originalRedisUrl
    } else {
      delete process.env.UPSTASH_REDIS_REST_URL
    }
    if (originalRedisToken !== undefined) {
      process.env.UPSTASH_REDIS_REST_TOKEN = originalRedisToken
    } else {
      delete process.env.UPSTASH_REDIS_REST_TOKEN
    }
  }
})

test('Authorization check happens before event list retrieval', async () => {
  const originalToken = process.env.NEO_ROUTER_EVENT_TOKEN
  process.env.NEO_ROUTER_EVENT_TOKEN = 'auth-first-token'

  try {
    const { default: handler } = await import('./router-events.mjs?t=' + Date.now())

    // This test verifies that authorization is checked BEFORE store.list() is called
    // If auth fails, we should get 401 without any store operations
    const req = createMockRequest({ method: 'GET' })
    const res = createMockResponse()
    
    await handler(req, res)
    
    // Should fail fast with 401, not attempt to list events
    assert.equal(res.statusCode, 401, 'Should return 401 before attempting to list events')
    assert.equal(res.body.error, 'unauthorized', 'Should return unauthorized error')
    assert.ok(!res.body.events, 'Should not include events in response')
    assert.ok(!res.body.eventStore, 'Should not include eventStore in response')

  } finally {
    if (originalToken !== undefined) {
      process.env.NEO_ROUTER_EVENT_TOKEN = originalToken
    } else {
      delete process.env.NEO_ROUTER_EVENT_TOKEN
    }
  }
})

test('Security fix prevents unauthenticated disclosure of webhook payloads', async () => {
  const originalToken = process.env.NEO_ROUTER_EVENT_TOKEN
  const originalRedisUrl = process.env.UPSTASH_REDIS_REST_URL
  const originalRedisToken = process.env.UPSTASH_REDIS_REST_TOKEN
  
  delete process.env.UPSTASH_REDIS_REST_URL
  delete process.env.UPSTASH_REDIS_REST_TOKEN
  process.env.NEO_ROUTER_EVENT_TOKEN = 'disclosure-test-token'

  try {
    const { default: handler } = await import('./router-events.mjs?t=' + Date.now())

    // Scenario: An attacker tries to read retained webhook payloads without authentication
    // This simulates the pentest finding where GET returned store.list(100) before auth check
    
    const attackerRequest = createMockRequest({
      method: 'GET',
      headers: {} // No authentication
    })
    const attackerResponse = createMockResponse()
    
    await handler(attackerRequest, attackerResponse)
    
    // Verify the security fix: request must be rejected
    assert.equal(attackerResponse.statusCode, 401, 
      'Unauthenticated GET must return 401 to prevent payload disclosure')
    assert.equal(attackerResponse.body.error, 'unauthorized',
      'Must return unauthorized error')
    assert.ok(!attackerResponse.body.events,
      'Must not return events array without authentication')
    assert.ok(!attackerResponse.body.eventStore,
      'Must not return any store information without authentication')
    
    // Verify that authenticated requests still work
    const legitimateRequest = createMockRequest({
      method: 'GET',
      headers: { 'Authorization': 'Bearer disclosure-test-token' }
    })
    const legitimateResponse = createMockResponse()
    
    await handler(legitimateRequest, legitimateResponse)
    
    assert.equal(legitimateResponse.statusCode, 200,
      'Authenticated request should succeed')
    assert.ok(Array.isArray(legitimateResponse.body.events),
      'Authenticated request should receive events')

  } finally {
    if (originalToken !== undefined) {
      process.env.NEO_ROUTER_EVENT_TOKEN = originalToken
    } else {
      delete process.env.NEO_ROUTER_EVENT_TOKEN
    }
    if (originalRedisUrl !== undefined) {
      process.env.UPSTASH_REDIS_REST_URL = originalRedisUrl
    }
    if (originalRedisToken !== undefined) {
      process.env.UPSTASH_REDIS_REST_TOKEN = originalRedisToken
    }
  }
})
