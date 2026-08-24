import test from 'node:test'
import assert from 'node:assert/strict'
import { createMissionEngine, MISSION_STATUS } from './mission-engine.mjs'
import { createMemoryStateStore } from './persistent-store.mjs'
import { createPersistentMissionRuntime } from './mission-runtime.mjs'

function fixedClock(){let t=Date.parse('2026-08-24T01:00:00Z');return {now:()=>new Date(t).toISOString(),advance:(ms)=>{t+=ms}}}

test('blocks missions until dependencies complete',()=>{
 const e=createMissionEngine();e.queue({id:'A',objective:'first'});e.queue({id:'B',objective:'second',dependencies:['A']});
 assert.equal(e.prepare('B').status,MISSION_STATUS.BLOCKED);e.prepare('A');e.transition('A',MISSION_STATUS.COMPLETED);e.refreshBlocked();assert.equal(e.get('B').status,MISSION_STATUS.QUEUED)
})

test('retries with exponential backoff and releases when due',()=>{
 const c=fixedClock();const e=createMissionEngine({clock:c.now});e.queue({id:'R',objective:'retry',retryPolicy:{maxAttempts:3,baseDelayMs:1000}});e.prepare('R');const r=e.scheduleRetry('R','temporary');assert.equal(r.status,MISSION_STATUS.RETRY_WAIT);assert.equal(r.nextAttemptAt,'2026-08-24T01:00:01.000Z');c.advance(1000);e.releaseRetries();assert.equal(e.get('R').status,MISSION_STATUS.QUEUED)
})

test('snapshot hydrates restart-safe state',()=>{
 const e=createMissionEngine();e.queue({id:'P',objective:'persist'});e.prepare('P');const restored=createMissionEngine({initialState:e.snapshot()});assert.equal(restored.get('P').status,MISSION_STATUS.RUNNING);assert.ok(restored.telemetry().events.length>=2)
})

test('persistent runtime survives a new engine instance',async()=>{
 const store=createMemoryStateStore();const runtime=createPersistentMissionRuntime({store});await runtime.withEngine(e=>e.queue({id:'D',objective:'durable contract'}));const data=await runtime.telemetry();assert.equal(data.missions[0].id,'D');assert.equal(data.persistence.mode,'memory')
})
