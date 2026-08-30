import test from 'node:test'
import assert from 'node:assert/strict'
import { createStewardshipGateway } from './gateway.mjs'

async function withServer(server, fn) {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  try { await fn(`http://127.0.0.1:${port}`) } finally { await new Promise(resolve => server.close(resolve)) }
}

test('health exposes safe gateway state', async () => {
  const server = createStewardshipGateway({ token: 'secret', appendAudit: async () => {} })
  await withServer(server, async base => {
    const response = await fetch(`${base}/health`)
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.equal(body.status, 'ok')
    assert.equal(body.authenticatedEvents, true)
    assert.equal(body.boundaries.autonomousTokenSaleExecution, false)
  })
})

test('event endpoint rejects missing bearer token', async () => {
  const server = createStewardshipGateway({ token: 'secret', appendAudit: async () => {} })
  await withServer(server, async base => {
    const response = await fetch(`${base}/api/v1/wordpress/stewardship/events`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event: { type: 'wordpress.stewardship.page_snapshot' } })
    })
    assert.equal(response.status, 401)
  })
})

test('valid Holy Stewardship observation is accepted and audited without execution', async () => {
  const records = []
  const server = createStewardshipGateway({ token: 'secret', appendAudit: async record => records.push(record) })
  await withServer(server, async base => {
    const response = await fetch(`${base}/api/v1/wordpress/stewardship/events`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer secret' },
      body: JSON.stringify({
        event: {
          id: 'event-1',
          type: 'wordpress.stewardship.page_snapshot',
          site: 'https://holytemples.org',
          pageSlug: 'holy-stewardship',
          stage: 'EDUCATED',
          approvalRequired: false
        }
      })
    })
    assert.equal(response.status, 202)
    const body = await response.json()
    assert.equal(body.accepted, true)
    assert.equal(body.status, 'OBSERVED')
    assert.equal(records.length, 1)
    assert.deepEqual(records[0].execution, {
      publish: false,
      settlement: false,
      tokenSale: false,
      privateKeyCustody: false,
      status: 'OBSERVED'
    })
  })
})

test('receiver rejects other WordPress sites', async () => {
  const server = createStewardshipGateway({ token: 'secret', appendAudit: async () => {} })
  await withServer(server, async base => {
    const response = await fetch(`${base}/api/v1/wordpress/stewardship/events`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer secret' },
      body: JSON.stringify({ event: { type: 'wordpress.stewardship.page_snapshot', site: 'https://example.com' } })
    })
    assert.equal(response.status, 400)
    assert.equal((await response.json()).error, 'site_not_allowed')
  })
})
