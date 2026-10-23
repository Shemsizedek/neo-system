import test from 'node:test';import assert from 'node:assert/strict'
import {createLifecycle,canTransition,transitionLifecycle,createEvent,applyIdempotentEvent,createSaga,recordSagaStep,createRecoveryAction,routeException,createTimelineEntry,lifecycleSnapshot} from './fabric.mjs'
test('state machine enforces order',()=>{assert.equal(canTransition('APPLICATION_SUBMITTED','UNDERWRITING_COMPLETE'),true);assert.equal(canTransition('APPLICATION_SUBMITTED','FUNDED'),false)})
test('transition requires evidence',()=>{const l=createLifecycle({lifecycle_id:'l',application_id:'a',subject_id:'s'});assert.throws(()=>transitionLifecycle(l,{to:'UNDERWRITING_COMPLETE'}),/transition evidence required/)})
test('idempotency rejects duplicate key',()=>{const e=createEvent({event_id:'e',lifecycle_id:'l',event_type:'X',idempotency_key:'k'});assert.equal(applyIdempotentEvent({event:e,processedKeys:['k']}).duplicate,true)})
test('failed saga needs recovery',()=>{let s=createSaga({saga_id:'s',lifecycle_id:'l'});s=recordSagaStep(s,{step_id:'1',service:'G141',action:'evaluate',status:'FAILED'});assert.equal(s.status,'NEEDS_RECOVERY')})
test('recovery is manual by default',()=>{let s=createSaga({saga_id:'s',lifecycle_id:'l'});s=recordSagaStep(s,{step_id:'1',service:'G141',action:'evaluate',status:'FAILED'});assert.equal(createRecoveryAction({saga:s,step_id:'1',action:'retry',actor_id:'u'}).automatic_compensation,false)})
test('material exception routes to compliance',()=>{const l=createLifecycle({lifecycle_id:'l',application_id:'a',subject_id:'s'});assert.equal(routeException({lifecycle:l,exception_type:'BALANCE_MISMATCH'}).target,'GATE139')})
test('timeline entries are digest stamped',()=>{const t=createTimelineEntry({lifecycle_id:'l',event_type:'X',state:'APPLICATION_SUBMITTED'});assert.equal(typeof t.digest,'string')})
test('snapshot blocks bypass',()=>assert.equal(lifecycleSnapshot({}).cross_service_bypass,false))
