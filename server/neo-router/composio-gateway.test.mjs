import test from 'node:test'
import assert from 'node:assert/strict'
import { createComposioGateway, composioHealth, composioRuntimeCheck } from './composio-gateway.mjs'
import { createComposioGatewayServer } from './composio-gateway-server.mjs'

function fakeClient(tools = []) {
  const subjects = []
  return {
    subjects,
    async create(subject) {
      subjects.push(subject)
      return {
        async tools() { return tools },
        async execute(slug, arguments_) { return { slug, arguments_ } },
      }
    },
  }
}

async function withServer(server, run) {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  try { return await run(`http://127.0.0.1:${server.address().port}`) } finally { await new Promise((resolve) => server.close(resolve)) }
}

test('missing COMPOSIO_API_KEY fails safely and reports only configuration state', () => {
  const previous = process.env.COMPOSIO_API_KEY
  delete process.env.COMPOSIO_API_KEY
  try {
    assert.deepEqual(composioRuntimeCheck(), { composioConfigured: false })
    assert.deepEqual(composioHealth({ client: null }), {
      ok: false,
      service: 'neo-router-composio-gateway',
      composioConfigured: false,
      readOnly: true,
      mutations: false,
      clientInitialized: false,
    })
  } finally {
    if (previous === undefined) delete process.env.COMPOSIO_API_KEY
    else process.env.COMPOSIO_API_KEY = previous
  }
})

test('missing and invalid NEOpass identity are rejected', async () => {
  const gateway = createComposioGateway({ client: fakeClient() })
  await assert.rejects(() => gateway.readOnlyTools(), /neopass_identity_required/)
  await assert.rejects(() => gateway.readOnlyTools({ authenticated: false, subjectId: 'spoofed', trustBoundary: 'neo-gateway' }), /neopass_identity_required/)
  await assert.rejects(() => gateway.readOnlyTools({ authenticated: true, subjectId: 'spoofed' }), /neopass_identity_required/)
})

test('write-capable tool requests are rejected', async () => {
  const gateway = createComposioGateway({ client: fakeClient() })
  await assert.rejects(
    () => gateway.executeReadOnly({ authenticated: true, subjectId: 'neopass:user-1', trustBoundary: 'neo-gateway' }, { slug: 'GMAIL_SEND_EMAIL', arguments: {} }),
    /write_capable_tool_rejected/,
  )
})

test('authenticated read-only operation binds the Composio session to the trusted subject', async () => {
  const client = fakeClient([{ slug: 'GITHUB_GET_REPO', name: 'Get repository', description: 'Read repository metadata' }])
  const gateway = createComposioGateway({ client })
  const result = await gateway.executeReadOnly({ authenticated: true, subjectId: 'neopass:user-1', trustBoundary: 'neo-gateway' }, { slug: 'GITHUB_GET_REPO', arguments: { owner: 'neo', repo: 'system' } })
  assert.equal(result.status, 'ok')
  assert.equal(result.readOnly, true)
  assert.deepEqual(client.subjects, ['neopass:user-1'])
})

test('read-only tools return controlled connection-required state', async () => {
  const gateway = createComposioGateway({ client: fakeClient([]) })
  assert.deepEqual(await gateway.readOnlyTools({ authenticated: true, subjectId: 'neopass:user-2', trustBoundary: 'neo-gateway' }), {
    status: 'connection_required',
    reason: 'no_read_only_connection',
    readOnly: true,
  })
})

test('health and read-only API responses never expose secrets or accept client user IDs', async () => {
  const secret = 'composio-secret-must-not-appear'
  const previous = process.env.COMPOSIO_API_KEY
  process.env.COMPOSIO_API_KEY = secret
  const server = createComposioGatewayServer({
    gateway: createComposioGateway({ client: fakeClient([]) }),
    resolveTrustedIdentity: async () => ({ authenticated: true, subjectId: 'trusted-subject', trustBoundary: 'neo-gateway' }),
  })
  try {
    await withServer(server, async (base) => {
      const healthResponse = await fetch(`${base}/health`)
      const healthText = await healthResponse.text()
      assert.equal(healthResponse.status, 200)
      assert.equal(healthText.includes(secret), false)
      assert.equal(JSON.parse(healthText).composioConfigured, true)

      const readResponse = await fetch(`${base}/api/v1/composio/tools?userId=client-spoof`)
      const readText = await readResponse.text()
      assert.equal(readResponse.status, 200)
      assert.equal(readText.includes(secret), false)
      assert.equal(JSON.parse(readText).status, 'connection_required')
    })
  } finally {
    if (previous === undefined) delete process.env.COMPOSIO_API_KEY
    else process.env.COMPOSIO_API_KEY = previous
  }
})

test('API rejects a client-supplied identity when no trusted gateway resolver is bound', async () => {
  const server = createComposioGatewayServer({ gateway: createComposioGateway({ client: fakeClient([]) }) })
  await withServer(server, async (base) => {
    const response = await fetch(`${base}/api/v1/composio/tools`, { headers: { 'x-neo-pass-account': 'untrusted-client-id' } })
    assert.equal(response.status, 401)
    assert.deepEqual(await response.json(), { error: 'neopass_identity_required' })
  })
})
