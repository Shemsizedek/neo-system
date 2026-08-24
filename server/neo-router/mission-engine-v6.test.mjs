import test from 'node:test'
import assert from 'node:assert/strict'
import { createMissionEngine, MISSION_STATUS } from './mission-engine.mjs'
import { createWorkerRuntime } from './worker-runtime.mjs'
import { decomposeMission, reconcileMissionPlan } from './mission-planner.mjs'
import { createAsanaAgent } from './connector-agents.mjs'

test('approved action resumes once and completes without a second approval', async()=>{
  const engine=createMissionEngine();let calls=0
  engine.queue({id:'m1',objective:'approved write',actions:[{id:'write-1',connector:'mock',type:'mock.write',approvalRequired:true,mutating:true}]})
  const worker=createWorkerRuntime({engine,role:'general',adapters:{mock:async(_a,ctx)=>{assert.equal(ctx.approved,true);calls+=1;return {ok:true}}}})
  const first=await worker.executeMission(engine.get('m1'));assert.ok(first.awaitingApproval)
  const pending=engine.listApprovals({status:'pending'});assert.equal(pending.length,1)
  engine.decideApproval(pending[0].id,'approved','test-human')
  const second=await worker.executeMission(engine.get('m1'));assert.equal(second.completed,true);assert.equal(calls,1);assert.equal(engine.listApprovals().length,1)
})

test('ORIGIN decomposes dependencies and reconciles parent mission',()=>{
  const engine=createMissionEngine()
  const plan=decomposeMission(engine,{id:'P1',objective:'release',workstreams:[
    {id:'audit',workerRole:'software',actions:[{connector:'mock',type:'read',workerRole:'software'}]},
    {id:'track',workerRole:'operations',dependsOn:['audit'],actions:[{connector:'mock',type:'write',workerRole:'operations'}]},
  ]})
  assert.equal(plan.parent.status,MISSION_STATUS.RUNNING);assert.equal(plan.children.length,2)
  const audit=plan.children.find(m=>m.id.endsWith('AUDIT'));const track=plan.children.find(m=>m.id.endsWith('TRACK'))
  assert.deepEqual(track.dependencies,[audit.id]);engine.prepare(audit.id);engine.transition(audit.id,MISSION_STATUS.COMPLETED,{result:'ok'});engine.refreshBlocked();engine.prepare(track.id);engine.transition(track.id,MISSION_STATUS.COMPLETED,{result:'ok'})
  const done=reconcileMissionPlan(engine,'P1');assert.equal(done.state,'completed');assert.equal(done.parent.status,MISSION_STATUS.COMPLETED)
})

test('live mutating connector rejects execution without approval context',async()=>{
  const oldFetch=globalThis.fetch;let fetched=false
  globalThis.fetch=async()=>{fetched=true;return new Response(JSON.stringify({data:{gid:'1'}}),{status:200,headers:{'content-type':'application/json'}})}
  try{
    const agent=createAsanaAgent({env:{ASANA_ACCESS_TOKEN:'test'}})
    await assert.rejects(()=>agent({type:'asana.create_task',mutating:true,name:'x'},{}),/Approval required/)
    assert.equal(fetched,false)
    const result=await agent({type:'asana.create_task',mutating:true,name:'x'},{approved:true});assert.equal(result.data.gid,'1');assert.equal(fetched,true)
  }finally{globalThis.fetch=oldFetch}
})
