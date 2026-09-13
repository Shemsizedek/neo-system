import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {openTribunalDb} from './db.mjs'
import {issueProofOfService,recordServiceAttempt,registerServiceRecipient} from './serviceLedger.mjs'
import {alternateServicePlan,buildProofPacket,evaluateServiceEscalations,serviceTimeline} from './serviceCompliance.mjs'

function fixture(){const dir=mkdtempSync(join(tmpdir(),'neo-service-compliance-')),db=openTribunalDb(join(dir,'test.sqlite'));db.prepare('INSERT INTO users(id,email,display_name,password_hash,created_at) VALUES(?,?,?,?,?)').run('u1','clerk@example.test','Clerk','x',new Date().toISOString());db.prepare('INSERT INTO workspaces(id,name,created_by,created_at) VALUES(?,?,?,?)').run('w1','Tribunal','u1',new Date().toISOString());const service={authorize(){return true},audit(){return true}},principal={userId:'u1'};return{dir,db,service,principal,close(){db.close();rmSync(dir,{recursive:true,force:true})}}}

test('v1.6 builds service timeline and proof packet',()=>{const f=fixture();try{const r=registerServiceRecipient(f.db,f.service,f.principal,'w1',{claimNo:'C-600',noticeId:'N-600',recipientName:'Party',destination:'party@example.test',channel:'EMAIL'});recordServiceAttempt(f.db,f.service,f.principal,'w1',{recipientId:r.id,status:'DELIVERED',providerRef:'smtp:1',evidence:{receipt:'ok'}});issueProofOfService(f.db,f.service,f.principal,'w1',{recipientId:r.id});const timeline=serviceTimeline(f.db,f.service,f.principal,'w1','C-600');assert.equal(timeline.some(e=>e.type==='RECIPIENT_REGISTERED'),true);assert.equal(timeline.some(e=>e.type==='SERVICE_ATTEMPT'),true);assert.equal(timeline.some(e=>e.type==='PROOF_ISSUED'),true);const packet=buildProofPacket(f.db,f.service,f.principal,'w1','C-600');assert.equal(packet.claimNo,'C-600');assert.equal(packet.payloadHash.length,64)}finally{f.close()}})

test('v1.6 flags overdue service and proposes alternate service plan',()=>{const f=fixture();try{const r=registerServiceRecipient(f.db,f.service,f.principal,'w1',{claimNo:'C-601',noticeId:'N-601',destination:'party@example.test',channel:'EMAIL',deadlineAt:new Date(Date.now()-3600000).toISOString()});const result=evaluateServiceEscalations(f.db,f.service,f.principal,'w1','C-601');assert.equal(result.alerts.some(a=>a.level==='OVERDUE'),true);const plan=alternateServicePlan(f.db,f.service,f.principal,'w1',{recipientId:r.id,channels:['CERTIFIED_EMAIL','RECORD'],reason:'Primary channel deadline passed.'});assert.equal(plan.status,'PROPOSED');assert.equal(plan.channels.length,2);assert.match(plan.boundary,/does not itself establish legally sufficient service/)}finally{f.close()}})
