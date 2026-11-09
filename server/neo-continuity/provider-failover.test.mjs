import test from 'node:test'
import assert from 'node:assert/strict'
import {buildProviderFailoverDecision as decide} from './provider-failover.mjs'

const now = '2026-11-08T08:00:00Z'
const candidate = (id, provider, extra = {}) => ({id, provider,
  failureDomains: [provider], status: 'healthy', checkedAt: now,
  capabilities: ['http'], costClass: 'free', alwaysOn: true,
  quotaUsed: 10, quotaLimit: 100, ...extra})
const input = (backup = {}, extra = {}) => ({service: 'school', now, preapproved: true,
  primary: candidate('primary', 'provider-a', {status: 'down'}),
  backups: [candidate('backup', 'provider-b', backup)], ...extra})

test('selects independent fresh free capacity after primary failure', () => {
  const result = decide(input())
  assert.equal(result.selected, 'backup')
  assert.equal(result.automatic, true)
  assert.equal(result.execution, 'decision_only')
})
test('keeps a healthy eligible primary and reports independent readiness', () => {
  const result = decide(input({}, {primary: candidate('primary', 'provider-a')}))
  assert.equal(result.mode, 'primary')
  assert.equal(result.automatic, false)
  assert.equal(result.independentBackupReady, true)
})
for (const [reason, change] of [
  ['independence_unverified', {provider: 'provider-a'}],
  ['independence_unverified', {failureDomains: ['provider-a']}],
  ['unknown_failure_domains', {failureDomains: []}],
  ['health_not_fresh', {checkedAt: '2026-11-08T07:00:00Z'}],
  ['health_not_fresh', {checkedAt: '2026-11-08T08:01:00Z'}],
  ['health_not_fresh', {checkedAt: 'bad-date'}],
  ['quota_unavailable', {quotaUsed: 80}],
  ['quota_unavailable', {quotaLimit: 0}],
  ['quota_unavailable', {quotaUsed: '10'}],
  ['free_capacity_unverified', {costClass: 'unknown'}],
  ['always_on_unverified', {alwaysOn: false}],
  ['capability_mismatch', {capabilities: ['static']}],
  ['not_healthy', {status: 'degraded'}],
]) test(`rejects ${reason}: ${JSON.stringify(change)}`, () => {
  const result = decide(input(change))
  assert.equal(result.mode, 'unavailable')
  assert.equal(result.automatic, false)
  assert.ok(result.assessments[1].reasons.includes(reason))
})
test('unknown primary ownership cannot prove independence', () => {
  assert.equal(decide(input({}, {primary: {id: 'primary', status: 'down'}})).selected, null)
})
test('stateful backup requires restore and replication evidence and never self-promotes', () => {
  assert.equal(decide(input({}, {stateful: true})).selected, null)
  const result = decide(input({restoreVerified: true, replicationFresh: true}, {stateful: true}))
  assert.equal(result.selected, 'backup')
  assert.equal(result.automatic, false)
  assert.equal(result.requires_authority, true)
})
test('can explicitly allow sleeping static fallback and paid capacity', () => {
  const result = decide(input({alwaysOn: false, costClass: 'paid'}, {alwaysOn: false, freeOnly: false}))
  assert.equal(result.selected, 'backup')
})
test('preapproval must be explicit boolean authority', () => {
  assert.equal(decide(input({}, {preapproved: 'true'})).automatic, false)
})
test('malformed policy and duplicate candidate identities fail closed', () => {
  for (const extra of [{maxAgeMs: NaN}, {quotaCeiling: 0}, {now: 'invalid'},
    {backups: [candidate('primary', 'provider-b')]}]) assert.throws(() => decide(input({}, extra)), TypeError)
})
test('selection does not mutate evidence', () => {
  const value = input()
  const before = structuredClone(value)
  decide(value)
  assert.deepEqual(value, before)
})
