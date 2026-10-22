import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {buildAutonomousSecurityDecision,buildSecurityAutopilotStatus,confidenceForSignals} from './autonomous-security-posture.mjs'

const policy=JSON.parse(fs.readFileSync('architecture/neo-autonomous-security-policy.json','utf8'))
const signal=(id,source,severity='critical',type='runtime.drift')=>({id,source,type,severity,subject:'neo-edge'})

test('cross-source critical signals increase confidence',()=>{
  const one=confidenceForSignals([signal('1','runtime')])
  const two=confidenceForSignals([signal('1','runtime'),signal('2','identity')])
  assert.ok(two>one)
})

test('safe defensive response can execute while high-impact actions remain gated',()=>{
  const decision=buildAutonomousSecurityDecision({
    signals:[signal('1','runtime'),signal('2','identity','high','identity.key.compromise')],
    approved:false,
    policy
  })
  assert.ok(decision.evidence.length===2)
  assert.ok(decision.actions.some(a=>a.mode==='APPROVAL_REQUIRED'&&!a.authorized))
  assert.equal(decision.escalation_required,true)
})

test('approval alone is insufficient when corroboration policy is not met',()=>{
  const decision=buildAutonomousSecurityDecision({
    signals:[signal('1','runtime','critical','identity.key.compromise')],
    approved:true,
    policy
  })
  assert.equal(decision.corroborated,false)
  assert.ok(decision.actions.filter(a=>a.mode==='APPROVAL_REQUIRED').every(a=>a.authorized===false))
})

test('status exposes site autopilot without privileged public execution',()=>{
  const status=buildSecurityAutopilotStatus({routerHealth:{ok:true,configured:['openai']},policy})
  assert.equal(status.site.host,'neo.holytemples.org')
  assert.equal(policy.site_autopilot.public_privileged_execution,false)
  assert.equal(policy.site_autopilot.requires_trusted_neopass_identity,true)
})
