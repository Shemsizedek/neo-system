import test from 'node:test'
import assert from 'node:assert/strict'
import {DatabaseSync} from 'node:sqlite'
import {encryptEnvelope} from './security.mjs'
import {communicationsReport,createTemplate,hearingIcs,listOutbox,processCommunication,queueCommunication,retryDeadLetter,saveProviderConfig} from './communications.mjs'

function fixture(){
  process.env.NEO_TRIBUNAL_MASTER_KEY='test-master-key'
  const db=new DatabaseSync(':memory:')
  db.exec(`CREATE TABLE communication_templates(id TEXT PRIMARY KEY,workspace_id TEXT,name TEXT,channel TEXT,subject_template TEXT,body_template TEXT,created_by TEXT,updated_at TEXT,created_at TEXT);
  CREATE TABLE provider_configs(id TEXT PRIMARY KEY,workspace_id TEXT,provider_type TEXT,label TEXT,config_envelope TEXT,enabled INTEGER,created_by TEXT,updated_at TEXT,created_at TEXT);
  CREATE TABLE communication_outbox(id TEXT PRIMARY KEY,workspace_id TEXT,notice_id TEXT,channel TEXT,destination TEXT,subject TEXT,body TEXT,status TEXT,attempt_count INTEGER,next_attempt_at TEXT,last_error TEXT,provider_ref TEXT,receipt_json TEXT,created_by TEXT,updated_at TEXT,created_at TEXT);
  CREATE TABLE hearings(hearing_id TEXT PRIMARY KEY,workspace_id TEXT,claim_no TEXT,envelope_json TEXT,starts_at TEXT,status TEXT,updated_at TEXT,created_at TEXT);
  CREATE TABLE calendar_exports(id TEXT PRIMARY KEY,workspace_id TEXT,hearing_id TEXT,format TEXT,payload_hash TEXT,created_by TEXT,created_at TEXT);`)
  const events=[]
  const service={authorize(){return true},audit(_p,_w,action,subject,payload){events.push({action,subject,payload})}}
  const principal={userId:'chief-1'},workspaceId='ws-1'
  return {db,service,principal,workspaceId,events}
}

test('templates render into queued messages and internal record delivery receives receipt',()=>{
  const {db,service,principal,workspaceId}=fixture()
  const template=createTemplate(db,service,principal,workspaceId,{name:'Notice',channel:'RECORD',subjectTemplate:'Claim {{claimNo}}',bodyTemplate:'Peace {{name}}, claim {{claimNo}} is filed.'})
  const item=queueCommunication(db,service,principal,workspaceId,{channel:'RECORD',destination:'tribunal-ledger',templateId:template.id,templateData:{name:'Respondent',claimNo:'WT-4100'}})
  assert.equal(item.status,'READY')
  const delivered=processCommunication(db,service,principal,workspaceId,item.id)
  assert.equal(delivered.status,'DELIVERED')
  assert.equal(delivered.receipt.type,'INTERNAL_RECORD')
  assert.match(listOutbox(db,service,principal,workspaceId)[0].body,/WT-4100/)
})

test('failed provider messages retry then dead-letter and may be requeued',()=>{
  const {db,service,principal,workspaceId}=fixture()
  const item=queueCommunication(db,service,principal,workspaceId,{channel:'CERTIFIED_EMAIL',destination:'party@example.test',subject:'Notice',body:'Service copy'})
  assert.equal(processCommunication(db,service,principal,workspaceId,item.id,{outcome:'FAILED',error:'provider unavailable',maxAttempts:2}).status,'RETRY')
  assert.equal(processCommunication(db,service,principal,workspaceId,item.id,{outcome:'FAILED',error:'provider unavailable',maxAttempts:2}).status,'DEAD_LETTER')
  assert.equal(retryDeadLetter(db,service,principal,workspaceId,item.id).status,'RETRY')
})

test('provider secrets are encrypted and report exposes only fingerprint metadata',()=>{
  const {db,service,principal,workspaceId}=fixture()
  const config=saveProviderConfig(db,service,principal,workspaceId,{providerType:'WEBHOOK',label:'Certified relay',enabled:true,secretConfig:{url:'https://example.invalid/hook',token:'secret'}})
  assert.equal(config.enabled,true)
  const raw=db.prepare('SELECT config_envelope FROM provider_configs WHERE id=?').get(config.id).config_envelope
  assert.equal(raw.includes('secret'),false)
  assert.equal(config.configFingerprint.length,16)
})

test('hearing exports RFC-style ICS with integrity hash and reporting counts',()=>{
  const {db,service,principal,workspaceId}=fixture()
  const hearing={hearingId:'H-1',claimNo:'WT-4200',startsAt:'2026-09-10T15:00:00Z',durationMinutes:90,title:'Status Hearing',location:'Adept Chamber',status:'SCHEDULED'}
  db.prepare('INSERT INTO hearings VALUES(?,?,?,?,?,?,?,?)').run(hearing.hearingId,workspaceId,hearing.claimNo,JSON.stringify(encryptEnvelope(hearing)),hearing.startsAt,hearing.status,new Date().toISOString(),new Date().toISOString())
  const exported=hearingIcs(db,service,principal,workspaceId,hearing.hearingId)
  assert.match(exported.content,/BEGIN:VCALENDAR/)
  assert.match(exported.content,/DTSTART:20260910T150000Z/)
  assert.equal(exported.payloadHash.length,64)
  const report=communicationsReport(db,service,principal,workspaceId)
  assert.equal(report.calendarExports,1)
})
