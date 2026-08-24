import test from 'node:test'
import assert from 'node:assert/strict'
import { createMemoryEventStore, ingestRouterEvent, matchEventRule } from './event-engine.mjs'
import { createMemoryStateStore } from './persistent-store.mjs'
import { createPersistentMissionRuntime } from './mission-runtime.mjs'

function runtime(){return createPersistentMissionRuntime({store:createMemoryStateStore()})}

test('matches governed event rules',()=>{
  const rule=matchEventRule({source:'github',type:'workflow_run.failed'})
  assert.equal(rule?.id,'github-ci-failure')
  assert.equal(rule?.priority,'critical')
})

test('routes a verified event into one mission and deduplicates replay',async()=>{
  const store=createMemoryEventStore(),rt=runtime()
  const event={id:'delivery-123',source:'github',type:'workflow_run.failed',payload:{workflow_run:{id:9}}}
  const first=await ingestRouterEvent({event,store,runtime:rt})
  assert.equal(first.duplicate,false)
  assert.equal(first.mission.priority,'critical')
  const second=await ingestRouterEvent({event,store,runtime:rt})
  assert.equal(second.duplicate,true)
  const telemetry=await rt.telemetry()
  assert.equal(telemetry.missions.length,1)
})

test('unknown events are retained but do not create missions',async()=>{
  const store=createMemoryEventStore(),rt=runtime()
  const result=await ingestRouterEvent({event:{id:'unknown-1',source:'github',type:'repository.starred',payload:{}},store,runtime:rt})
  assert.equal(result.mission,null)
  assert.equal((await store.get('unknown-1')).status,'ignored')
  assert.equal((await rt.telemetry()).missions.length,0)
})
