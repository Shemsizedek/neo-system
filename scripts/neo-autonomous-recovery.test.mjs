import test from 'node:test'
import assert from 'node:assert/strict'
import {loadRunbooks,classifyFailure,buildRecoveryPlan,authorizeRecovery,executeSafeRecovery,buildExistingControlLoopProposal,verifyRecovery,recoveryDecision} from './neo-autonomous-recovery.mjs'

test('known transient failures receive bounded automatic recovery',()=>{
  const plan=buildRecoveryPlan({service:'neo-router',signal:{error:'connection reset',transient:true}})
  assert.equal(plan.failure_class,'TRANSIENT')
  assert.equal(plan.auto_executable,true)
  const auth=authorizeRecovery(plan)
  assert.equal(auth.authorized,true)
  const exec=executeSafeRecovery({authorization:auth,actionExecutor:action=>({ok:true,action})})
  assert.equal(exec.status,'EXECUTED')
})

test('unknown failures never self-modify production',()=>{
  const plan=buildRecoveryPlan({service:'neo-bank',signal:{error:'strange-new-condition'}})
  assert.equal(plan.failure_class,'UNKNOWN')
  const auth=authorizeRecovery(plan,{approved:true})
  assert.equal(auth.authorized,false)
  assert.equal(auth.status,'ESCALATE')
})

test('bad release requires explicit approval and reuses existing autonomous-operation controls',()=>{
  const plan=buildRecoveryPlan({service:'neo-counter',signal:{release_regression:true}})
  assert.equal(plan.failure_class,'BAD_RELEASE')
  assert.equal(authorizeRecovery(plan).authorized,false)
  assert.equal(authorizeRecovery(plan,{approved:true}).authorized,true)
  const controls=buildExistingControlLoopProposal(plan,{release_regression:true})
  assert.equal(controls.proposal.action,'rollback-deployment')
  assert.equal(controls.proposal.approvalRequired,true)
})

test('credential and database failures are escalated',()=>{
  for(const signal of [{http_status:401},{database_unavailable:true}]){
    const plan=buildRecoveryPlan({service:'critical',signal})
    assert.equal(plan.escalation_required,true)
    assert.equal(authorizeRecovery(plan).authorized,false)
  }
})

test('recovery verification must show actual health improvement',()=>{
  const plan=buildRecoveryPlan({service:'neo-router',signal:{transient:true}})
  const exec=executeSafeRecovery({authorization:authorizeRecovery(plan),actionExecutor:action=>({ok:true,action})})
  const good=verifyRecovery({execution:exec,healthy:true})
  assert.equal(good.status,'verified')
  const bad=verifyRecovery({execution:exec,healthy:false})
  assert.equal(bad.status,'verification-failed')
  assert.equal(recoveryDecision({verification:bad,rollbackAvailable:false}).rollbackRequired,false)
})

test('runbook registry contains explicit unknown-failure stop policy',()=>{
  const config=loadRunbooks()
  assert.equal(config.safety.unknown_failure_policy,'ESCALATE')
  assert.ok(config.safety.never_auto_without_separate_authority.includes('move_funds'))
  assert.ok(config.runbooks.some(r=>r.failure_class==='UNKNOWN'&&r.autonomy==='ESCALATE'))
})
