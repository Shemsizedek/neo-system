import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createBillRegistry,ARTWORK_SHA256} from './registry.mjs';

function setup(t){const dir=mkdtempSync(join(tmpdir(),'nomni-bill-'));const filename=join(dir,'drafts.sqlite');const handles=[];t.after(()=>{for(const h of handles)try{h.close();}catch{}rmSync(dir,{recursive:true,force:true});});return ()=>{const h=createBillRegistry({filename});handles.push(h);return h;};}
const evidence=()=>({network:'counterparty-mainnet',asset:'NOMNI',amount:'1',artworkSha256:ARTWORK_SHA256,fundingTxHash:'a'.repeat(64),fundingEventIndex:'0',fundingAddress:'test-fixture-not-a-real-funding-address',custodyPolicyRef:'fixture:custody',redemptionTermsRef:'fixture:redemption'});

test('reservation survives restart and retries from separate connections return one serial',t=>{
 const open=setup(t);let first=open();const draft=first.reserveDraft({requestId:'print-job-1'});first.close();
 const second=open(),third=open();assert.equal(second.reserveDraft({requestId:'print-job-1'}).serial,draft.serial);assert.equal(third.reserveDraft({requestId:'print-job-1'}).serial,draft.serial);
 assert.notEqual(third.reserveDraft({requestId:'print-job-2'}).serial,draft.serial);assert.equal(second.get(draft.serial).status,'DRAFT');
});
test('all declared evidence still fails closed; redemption cannot execute or change draft state',t=>{
 const registry=setup(t)();const {serial}=registry.reserveDraft({requestId:'job-1'});const assessment=registry.submitEvidence(serial,evidence());
 assert.equal(assessment.evidenceStatus,'SUBMITTED_UNVERIFIED');assert.equal(assessment.readyForCirculation,false);assert.equal(assessment.fundingVerified,false);assert.equal(assessment.circulationEnabled,false);
 assert.ok(assessment.blockers.includes('live_funding_verifier_not_connected'));
 for(let i=0;i<2;i++)assert.throws(()=>registry.requestRedemption(serial),/circulation_disabled/);
 assert.equal(registry.get(serial).status,'DRAFT');
});
test('funding evidence cannot be allocated to two drafts, including across connections',t=>{
 const open=setup(t),a=open(),b=open();const one=a.reserveDraft({requestId:'a'}),two=b.reserveDraft({requestId:'b'});
 a.submitEvidence(one.serial,evidence());assert.throws(()=>b.submitEvidence(two.serial,evidence()),/already_claimed/);
 assert.deepEqual(b.get(two.serial).evidence,{});assert.equal(a.get(one.serial).evidence.fundingTxHash,'a'.repeat(64));
 // A separate claimed event is allowed as unverified evidence only.
 assert.equal(b.submitEvidence(two.serial,{...evidence(),fundingEventIndex:'1'}).fundingVerified,false);
});
test('invalid asset, denomination, network, artwork and secret fields are rejected before storage',t=>{
 const r=setup(t)(),{serial}=r.reserveDraft({requestId:'job-1'});
 for(const changed of [{asset:'BTC'},{amount:'1.0'},{network:'testnet'},{artworkSha256:'0'.repeat(64)},{privateKey:'secret'},{fundingTxHash:'not-a-hash'},{fundingEventIndex:'-1'}])assert.throws(()=>r.submitEvidence(serial,{...evidence(),...changed}));
 assert.deepEqual(r.get(serial).evidence,{});assert.throws(()=>r.reserveDraft({requestId:'x',denomination:1}),/denomination/);
 assert.throws(()=>r.submitEvidence(serial,{fundingTxHash:'a'.repeat(64)}),/required_together/);
});
test('missing evidence is explicit and returned objects cannot mutate persisted records',t=>{
 const r=setup(t)(),{serial}=r.reserveDraft({requestId:'job-1'});const result=r.assessReadiness(serial);
 assert.equal(result.evidenceStatus,'INCOMPLETE');assert.ok(result.missingEvidence.includes('fundingTxHash'));result.evidence.asset='FAKE';assert.deepEqual(r.get(serial).evidence,{});
 assert.throws(()=>r.assessReadiness('unknown'),/unknown_serial/);
});
