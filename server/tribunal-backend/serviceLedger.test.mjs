import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {openTribunalDb} from './db.mjs'
import {issueProofOfService,recordServiceAttempt,registerServiceRecipient,serviceCompliance,verifyServiceLedger} from './serviceLedger.mjs'

function fixture(){const dir=mkdtempSync(join(tmpdir(),'neo-service-ledger-')),db=openTribunalDb(join(dir,'test.sqlite'));db.prepare('INSERT INTO users(id,email,display_name,password_hash,created_at) VALUES(?,?,?,?,?)').run('u1','clerk@example.test','Clerk','x',new Date().toISOString());db.prepare('INSERT INTO workspaces(id,name,created_by,created_at) VALUES(?,?,?,?)').run('w1','Tribunal','u1',new Date().toISOString());const service={authorize(){return true},audit(){return true}},principal={userId:'u1'};return{dir,db,service,principal,close(){db.close();rmSync(dir,{recursive:true,force:true})}}}

test('service ledger records recipient, service attempt, proof and compliance',()=>{const f=fixture();try{const recipient=registerServiceRecipient(f.db,f.service,f.principal,'w1',{claimNo:'C-100',noticeId:'N-1',recipientName:'Respondent',destination:'respondent@example.test',channel:'CERTIFIED_EMAIL',deadlineAt:new Date(Date.now()+86400000).toISOString()});assert.equal(recipient.status,'PENDING');const attempt=recordServiceAttempt(f.db,f.service,f.principal,'w1',{recipientId:recipient.id,status:'DELIVERED',providerRef:'provider:123',evidence:{receipt:'ok'}});assert.equal(attempt.status,'SERVED');const proof=issueProofOfService(f.db,f.service,f.principal,'w1',{recipientId:recipient.id});assert.equal(proof.proofType,'INTERNAL_CERTIFICATE');assert.match(proof.legalBoundary,/Internal Tribunal record/);const compliance=serviceCompliance(f.db,f.service,f.principal,'w1','C-100');assert.equal(compliance.complete,true);assert.equal(compliance.summary.served,1);const verified=verifyServiceLedger(f.db,f.service,f.principal,'w1');assert.equal(verified.valid,true);assert.equal(verified.count,3)}finally{f.close()}})

test('proof cannot issue before recipient is served',()=>{const f=fixture();try{const recipient=registerServiceRecipient(f.db,f.service,f.principal,'w1',{claimNo:'C-200',noticeId:'N-2',destination:'party@example.test',channel:'EMAIL'});assert.throws(()=>issueProofOfService(f.db,f.service,f.principal,'w1',{recipientId:recipient.id}),/requires recipient status SERVED/)}finally{f.close()}})
