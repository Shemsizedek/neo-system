import test from 'node:test'
import assert from 'node:assert/strict'
import { authorizeFidelisNous, fidelisNousCapabilities, proposeKnowledgeRecord } from './bridge.mjs'

test('integration is sandbox and cannot issue tokens', () => {
  const c = fidelisNousCapabilities()
  assert.equal(c.tokenIssuance, false)
  assert.equal(c.ledgerWrites, false)
})
test('unknown action denied without calling verifier', async () => {
  const result = await authorizeFidelisNous({ authorization: 'x', action: 'token:issue', verify: () => { throw Error('should not call') } })
  assert.equal(result.status, 403)
})
test('missing authorization denied', async () => {
  const result = await authorizeFidelisNous({})
  assert.equal(result.status, 401)
})
test('read authorization uses scoped Crown verification', async () => {
  const result = await authorizeFidelisNous({ authorization: 'test', verify: async ({ requiredScope }) => ({ ok: requiredScope === 'fidelis:knowledge:read' }) })
  assert.equal(result.ok, true)
})
test('knowledge record remains a proposal', () => {
  const record = proposeKnowledgeRecord({ title: 'Index', source: 'https://holytemples.org', collection: 'world-library' })
  assert.equal(record.published, false)
  assert.equal(record.ledgerWritten, false)
})
test('reject invalid source', () => {
  assert.throws(() => proposeKnowledgeRecord({ title: 'X', source: 'http://127.0.0.1:5173', collection: 'world-library' }), /invalid_https_source/)
})
