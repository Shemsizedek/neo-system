import test from 'node:test'
import assert from 'node:assert/strict'
import { createMissionEngine, MISSION_STATUS } from './mission-engine.mjs'
import { createWorkerFleet } from './worker-fleet.mjs'
import { createMemoryDeadLetterQueue } from './dead-letter.mjs'
import { createLeaseManager } from './worker-runtime.mjs'

test('routes missions to worker role and capabilities', async()=>{
  const engine=createMissionEngine({idFactory:(()=>{let n=0;return()=>`id-${++n}`})()})
  engine.queue({id:'m1',objective:'repo check',priority:'high',actions:[{connector:'github',type:'inspect',workerRole:'software',capabilities:['github.read']}]})
  const fleet=createWorkerFleet({engine,adapters:{github:async()=>({ok:true})},profiles:[{id:'w1',role:'software',capabilities:['github.read'],concurrency:1}],leaseManager:createLeaseManager()})
  const result=await fleet.tick()
  assert.equal(result[0].completed,true)
  assert.equal(engine.get('m1').status,MISSION_STATUS.COMPLETED)
})

test('priority queue runs critical mission before low mission', async()=>{
  const engine=createMissionEngine()
  engine.queue({id:'low',objective:'low',priority:'low',actions:[{connector:'x'}]})
  engine.queue({id:'critical',objective:'critical',priority:'critical',actions:[{connector:'x'}]})
  const seen=[]
  const fleet=createWorkerFleet({engine,adapters:{x:async(_a,{mission})=>{seen.push(mission.id);return {ok:true}}},profiles:[{id:'w',role:'general',capabilities:[],concurrency:1}],leaseManager:createLeaseManager()})
  await fleet.tick()
  assert.deepEqual(seen,['critical'])
})

test('missing adapter eventually enters dead-letter after retry budget exhaustion', async()=>{
  let time=Date.parse('2026-08-24T00:00:00Z')
  const clock=()=>new Date(time).toISOString()
  const engine=createMissionEngine({clock})
  engine.queue({id:'bad',objective:'fail',actions:[{connector:'missing'}],retryPolicy:{maxAttempts:1,baseDelayMs:1}})
  const dead=createMemoryDeadLetterQueue()
  const fleet=createWorkerFleet({engine,profiles:[{id:'w',role:'general',capabilities:[],concurrency:1}],leaseManager:createLeaseManager({clock:()=>time}),deadLetter:dead})
  await fleet.tick()
  assert.equal(engine.get('bad').status,MISSION_STATUS.FAILED)
  assert.equal((await dead.list()).length,1)
})
