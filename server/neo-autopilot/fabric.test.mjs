import test from 'node:test'
import assert from 'node:assert/strict'
import {normalizeResource,classifyDrift,selectRepairAction,reconcileResource,capacityPlacement,reconcileEstate} from './fabric.mjs'

test('protected infrastructure drift escalates',()=>{
 const r=normalizeResource({fabric:'STATE',resource_id:'db',desired:{primary:'pg-a'},observed:{primary:'pg-b'}})
 const d=classifyDrift(r)
 assert.equal(d.state,'PROTECTED_DRIFT')
 assert.equal(selectRepairAction({resource:r,drift:d}).approval_required,true)
})

test('safe discovery repair may be planned inside maintenance window',()=>{
 const r=normalizeResource({fabric:'NETWORK',resource_id:'svc',desired:{discovery:'healthy'},observed:{discovery:'stale'}})
 const start=new Date(Date.now()-60000).toISOString(),end=new Date(Date.now()+60000).toISOString()
 const out=reconcileResource({resource:r,maintenanceWindows:[{start,end}]})
 assert.equal(out.status,'REPAIR_PLANNED')
})

test('production placement requires approval',()=>{
 const nodes=[{node_id:'n1',attested:true,health:'HEALTHY',capacity:{cpu_cores:8,memory_mb:16000,storage_gb:500}}]
 const w={requirements:{cpu_cores:2,memory_mb:2000,storage_gb:20}}
 assert.equal(capacityPlacement({workload:w,nodes,production:true,approved:false}).status,'AWAITING_APPROVAL')
})

test('estate reconciliation summarizes bounded work',()=>{
 const start=new Date(Date.now()-60000).toISOString(),end=new Date(Date.now()+60000).toISOString()
 const resources=[normalizeResource({fabric:'COMPUTE',resource_id:'n1',desired:{health:'HEALTHY'},observed:{health:'DEGRADED'}})]
 const x=reconcileEstate({resources,maintenanceWindows:[{start,end}]})
 assert.equal(x.estate,'Global Vast Estate')
 assert.equal(x.summary.resources,1)
})
