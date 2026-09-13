import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {openTribunalDb} from './db.mjs'
import {registerServiceRecipient} from './serviceLedger.mjs'
import {complianceRecommendations,syncCommunicationReceipts} from './serviceComplianceSync.mjs'

function fixture(){const dir=mkdtempSync(join(tmpdir(),'neo-compliance-sync-')),db=openTribunalDb(join(dir,'test.sqlite'));db.prepare('INSERT INTO users(id,email,display_name,password_hash,created_at) VALUES(?,?,?,?,?)').run('u1','clerk@example.test','Clerk','x',new Date().toISOString());db.prepare('INSERT INTO workspaces(id,name,created_by,created_at) VALUES(?,?,?,?)').run('w1','Tribunal','u1',new Date().toISOString());const service={authorize(){return true},audit(){return true}},principal={userId:'u1'};return{dir,db,service,principal,close(){db.close();rmSync(dir,{recursive:true,force:true})}}}

test('delivered communication receipt synchronizes recipient to served exactly once',()=>{const f=fixture();try{const recipient=registerServiceRecipient(f.db,f.service,f.principal,'w1',{claimNo:'C-300',noticeId:'N-300',recipientName:'Party',destination:'party@example.test',channel:'CERTIFIED_EMAIL'});const stamp=new Date().toISOString();f.db.prepare('INSERT INTO communication_outbox(id,workspace_id,notice_id,channel,destination,subject,body,status,attempt_count,next_attempt_at,last_error,provider_ref,receipt_json,created_by,updated_at,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run('comm-1','w1','N-300','CERTIFIED_EMAIL','party@example.test','Notice','Body','DELIVERED',1,null,null,'provider:1',JSON.stringify({accepted:true}),'u1',stamp,stamp);const first=syncCommunicationReceipts(f.db,f.service,f.principal,'w1',{claimNo:'C-300'});assert.equal(first.syncedCount,1);const row=f.db.prepare('SELECT status FROM service_recipients WHERE id=?').get(recipient.id);assert.equal(row.status,'SERVED');const second=syncCommunicationReceipts(f.db,f.service,f.principal,'w1',{claimNo:'C-300'});assert.equal(second.syncedCount,0)}finally{f.close()}})

test('recommendations reflect pending and overdue service',()=>{const f=fixture();try{registerServiceRecipient(f.db,f.service,f.principal,'w1',{claimNo:'C-400',noticeId:'N-400',destination:'party@example.test',channel:'EMAIL',deadlineAt:new Date(Date.now()-3600000).toISOString()});const result=complianceRecommendations(f.db,f.service,f.principal,'w1','C-400',{graceHours:24,maxAttempts:3});assert.equal(result.complete,false);assert.ok(result.recommendations.some(item=>item.action==='REVIEW_OVERDUE_SERVICE'));assert.match(result.boundary,/decision support/i)}finally{f.close()}})
