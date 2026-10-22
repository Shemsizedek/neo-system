import assert from 'node:assert/strict'
import test from 'node:test'
import { ACCESS_TIERS, classifyPrimeRoute, evaluatePrimeAccess } from './access-policy.mjs'

const token = 'gate-17-test-only-token'
const request = (overrides = {}) => evaluatePrimeAccess({ method: 'POST', path: '/api/prime', operatorToken: token, ...overrides })

test('unknown route and method fail closed', () => {
  assert.equal(classifyPrimeRoute('DELETE', '/api/prime'), ACCESS_TIERS.DENY)
  assert.equal(request({ path: '/api/unknown', authorization: `Bearer ${token}` }).allowed, false)
})

test('public HTML and minimal liveness routes need no token', () => {
  for (const path of ['/', '/oracle', '/oracle/']) assert.equal(evaluatePrimeAccess({ method: 'GET', path }).allowed, true)
  assert.equal(evaluatePrimeAccess({ method: 'GET', path: '/healthz' }).allowed, true)
})

test('detailed health and green AI requests require token', () => {
  assert.equal(evaluatePrimeAccess({ method: 'GET', path: '/health' }).allowed, false)
  assert.equal(request().reason, 'authentication_required')
  assert.equal(request({ authorization: 'Bearer incorrect' }).allowed, false)
  assert.equal(request({ authorization: `Bearer ${token}` }).allowed, true)
  assert.equal(request({ authorization: `Bearer ${token}`, operatorToken: '' }).allowed, false)
})

test('privileged execution needs bearer and explicit approval factors', () => {
  const auth = { approvalRequired: true, authorization: `Bearer ${token}` }
  assert.equal(request(auth).reason, 'approval_required')
  assert.equal(request({ ...auth, approved: true }).allowed, false)
  assert.equal(request({ ...auth, approvalHeader: 'approved' }).allowed, false)
  assert.equal(request({ ...auth, approved: true, approvalHeader: 'approved' }).allowed, true)
})

test('credentials cannot authorize unrecognized routes', () => {
  assert.equal(request({ method: 'PATCH', authorization: `Bearer ${token}`, approved: true, approvalHeader: 'approved' }).allowed, false)
})


test('least-privilege client token permits green but never privileged execution', () => {
  const client = 'test-client-only'
  const ordinary = request({ operatorToken: token, apiToken: client, authorization: `Bearer ${client}` })
  assert.equal(ordinary.allowed, true)
  const privileged = request({ operatorToken: token, apiToken: client, authorization: `Bearer ${client}`, approvalRequired: true, approved: true, approvalHeader: 'approved' })
  assert.equal(privileged.allowed, false)
  assert.equal(privileged.reason, 'authentication_required')
})

test('unconfigured API token cannot grant access', () => {
  const denied = request({ operatorToken: '', apiToken: '', authorization: 'Bearer anything' })
  assert.equal(denied.allowed, false)
})
