import test from 'node:test';
import assert from 'node:assert/strict';
import {createNeoTeleEvidenceRegistry,operatorEvidenceDashboard} from './evidence-registry.mjs';
test('require independent review before approval',async()=>{
 const records=new Map(),audits=[];
 const store=createNeoTeleEvidenceRegistry({save:async x=>(records.set(x.reference,x),x),read:async ref=>records.get(ref),appendAudit:async x=>audits.push(x)});
 const ref='contract-001';
 const pending=await store.submit({type:'carrierAgreement',reference:ref,digest:'sha256:'+'a'.repeat(64),submitter:'operator'});
 assert.equal(pending.status,'PENDING_REVIEW');
 await assert.rejects(()=>store.review({reference:ref,reviewer:'operator',decision:'APPROVED',independentlyChecked:true}),/invalid_evidence_review/);
 await assert.rejects(()=>store.review({reference:ref,reviewer:'reviewer',decision:'APPROVED'}),/independent_verification_required/);
 const approved=await store.review({reference:ref,reviewer:'reviewer',decision:'APPROVED',independentlyChecked:true});
 assert.equal(approved.status,'APPROVED');assert.equal(operatorEvidenceDashboard([approved])[0].approved,true);
 assert.equal(audits.length,2);
});
