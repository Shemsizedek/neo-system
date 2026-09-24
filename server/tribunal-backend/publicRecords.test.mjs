import test from 'node:test'
import assert from 'node:assert/strict'
import {openTribunalDb} from './db.mjs'
import {TribunalService} from './service.mjs'
import {ensurePublicRecordsSchema,getPublishedRecord,listPublishedRecords,listWorkspacePublicRecords,publishPublicRecord,withdrawPublicRecord} from './publicRecords.mjs'

const setup=()=>{
  process.env.NEO_TRIBUNAL_MASTER_KEY='public-records-test-master-key-1234567890'
  const db=openTribunalDb(':memory:')
  ensurePublicRecordsSchema(db)
  const service=new TribunalService(db)
  service.register({email:'judge-public@example.test',displayName:'Judge',password:'password123'})
  const login=service.login({email:'judge-public@example.test',password:'password123'})
  const principal=service.principal(login.token)
  const workspace=service.createWorkspace(principal,{name:'World Interfaith Court'})
  return {db,service,principal,workspace}
}

test('public records require deliberate publication and expose only the public payload',()=>{
  const {db,service,principal,workspace}=setup()
  const record=publishPublicRecord(db,service,principal,workspace.id,{
    claimNo:'WIC-2026-001',recordType:'ORDER',sourceId:'order-private-1',title:'Scheduling Order',
    summary:'Public scheduling entry.',publicPayload:{hearingDate:'2026-10-10',note:'Public notice'},sourceHash:'abc123'
  })
  assert.equal(record.claimNo,'WIC-2026-001')
  assert.equal(record.publicPayload.hearingDate,'2026-10-10')
  assert.equal(record.publicationHash.length,64)
  assert.equal(listPublishedRecords(db,{q:'scheduling'}).length,1)
  assert.equal(getPublishedRecord(db,record.recordId).title,'Scheduling Order')
  assert.equal(listWorkspacePublicRecords(db,service,principal,workspace.id).length,1)
  assert.equal(service.verifyAudit(workspace.id).valid,true)
  assert.equal(db.prepare('SELECT MAX(version) version FROM schema_meta').get().version,7)
})

test('withdrawn records disappear from public search while remaining in the administrative ledger',()=>{
  const {db,service,principal,workspace}=setup()
  const record=publishPublicRecord(db,service,principal,workspace.id,{claimNo:'WIC-2026-002',recordType:'NOTICE',title:'Public Notice',summary:'Notice summary.',publicPayload:{status:'issued'}})
  const result=withdrawPublicRecord(db,service,principal,workspace.id,record.recordId)
  assert.equal(result.status,'WITHDRAWN')
  assert.equal(listPublishedRecords(db,{claimNo:'WIC-2026-002'}).length,0)
  const admin=listWorkspacePublicRecords(db,service,principal,workspace.id,'WITHDRAWN')
  assert.equal(admin.length,1)
  assert.equal(admin[0].status,'WITHDRAWN')
  assert.throws(()=>getPublishedRecord(db,record.recordId),/not found/)
})
