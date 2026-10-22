import test from 'node:test'
import assert from 'node:assert/strict'
import {createStateRecord,compareRecords,evaluateMigrationReadiness,nextMigrationMode,createDualWriteAdapter,createMemoryStateBackend,createMemoryJournal,buildStateFabricSnapshot} from './fabric.mjs'

test('logical state record is deterministic enough for drift comparison',()=>{
  const a=createStateRecord({namespace:'crm',id:'1',data:{x:1},updatedAt:'2026-10-22T00:00:00Z'})
  const b=createStateRecord({namespace:'crm',id:'1',data:{x:1},updatedAt:'2026-10-22T00:00:00Z'})
  assert.equal(compareRecords(a,b).equal,true)
})

test('dual write records journal and detects secondary drift',async()=>{
  const p=createMemoryStateBackend(),s=createMemoryStateBackend(),j=createMemoryJournal()
  const a=createDualWriteAdapter({primary:p,secondary:s,journal:j})
  const result=await a.put('crm','1',{name:'A'})
  assert.equal(result.secondary_ok,true)
  assert.equal((await a.get('crm','1')).comparison.equal,true)
  assert.equal((await j.list()).length,1)
})

test('cutover readiness requires zero drift, backup, replica and rollback',()=>{
  const r=evaluateMigrationReadiness({mode:'DUAL_WRITE',comparisons:[{equal:true}],backupVerified:true,replicaHealthy:true,rollbackReady:true})
  assert.equal(r.ready,true)
  assert.equal(r.cutover_authorized,false)
})

test('postgres primary transition requires explicit approval',()=>{
  const readiness={ready:true}
  assert.equal(nextMigrationMode({current:'DUAL_WRITE',readiness,approved:false}).changed,false)
  assert.equal(nextMigrationMode({current:'DUAL_WRITE',readiness,approved:true}).current,'POSTGRES_PRIMARY')
})

test('snapshot describes independence as in progress, not complete',()=>{
  assert.equal(buildStateFabricSnapshot({}).firestore_independence,'IN_PROGRESS')
})
