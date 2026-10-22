import test from 'node:test'
import assert from 'node:assert/strict'
import {loadPolicy,normalizeExperience,detectPatterns,rankRunbookEvidence,generateLessons,generatePolicyRecommendations,buildLearningReport} from './neo-operational-learning.mjs'

const rec=(overrides={})=>normalizeExperience({
  type:'RECOVERY_ATTEMPT',
  service:'neo-router',
  failure_class:'TRANSIENT',
  action:'retry_probe',
  outcome:'SUCCESS',
  observed_at:'2026-10-22T12:00:00Z',
  ...overrides
})

test('Gate 106 normalizes experience with stable evidence fingerprint',()=>{
  const a=rec(), b=rec({observed_at:'2026-10-22T12:01:00Z'})
  assert.equal(a.fingerprint,b.fingerprint)
  assert.notEqual(a.experience_id,b.experience_id)
})

test('recurring experiences become patterns only after policy threshold',()=>{
  const policy=loadPolicy()
  const two=[rec(),rec({observed_at:'2026-10-22T12:01:00Z'})]
  assert.equal(detectPatterns(two,policy).length,0)
  const three=[...two,rec({observed_at:'2026-10-22T12:02:00Z'})]
  assert.equal(detectPatterns(three,policy).length,1)
})

test('runbook evidence can recommend review but cannot rewrite policy',()=>{
  const records=[
    rec({outcome:'FAILURE'}),
    rec({outcome:'FAILURE',observed_at:'2026-10-22T12:01:00Z'}),
    rec({outcome:'SUCCESS',observed_at:'2026-10-22T12:02:00Z'})
  ]
  const ranking=rankRunbookEvidence(records,loadPolicy())
  assert.equal(ranking[0].recommendation,'REVIEW_REQUIRED')
  const recommendations=generatePolicyRecommendations(generateLessons(records,loadPolicy()))
  assert.ok(recommendations.every(x=>x.auto_apply===false))
})

test('learning report separates evidence from policy mutation',()=>{
  const report=buildLearningReport([rec(),rec({observed_at:'2026-10-22T12:01:00Z'}),rec({observed_at:'2026-10-22T12:02:00Z'})],loadPolicy())
  assert.equal(report.gate,106)
  assert.equal(report.policy_mutated,false)
  assert.ok(report.lessons.length>0)
})

test('self-learning cannot grant itself authority',()=>{
  const policy=loadPolicy()
  assert.equal(policy.autonomy.may_auto_apply_policy_change,false)
  assert.equal(policy.autonomy.may_auto_change_authority,false)
  assert.equal(policy.autonomy.may_auto_change_security_boundary,false)
})
