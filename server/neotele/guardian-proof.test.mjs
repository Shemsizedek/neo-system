import test from 'node:test';
import assert from 'node:assert/strict';
import {createGuardianProofGate} from './guardian-proof.mjs';
const record={status:'PENDING_REVIEW',submitter:'sender',revision:3,digest:'sha256:'+'a'.repeat(64)};
const args={subject:'reviewer',reference:'e1',decision:'APPROVED',assertion:{credential:'signed'}};
function build(consumeChallenge=async()=>true){
 return createGuardianProofGate({loadEvidence:async()=>record,
 verifyWebAuthn:async({subject,reference,decision,revision,digest})=>({verified:true,subject,reference,decision,revision,digest,challengeId:'single-use',credentialId:'cred'}),
 consumeChallenge});
}
test('trusted proof permits review once',async()=>{
 const gate=build();assert.equal((await gate(args)).verified,true);
});
test('replayed challenges are denied',async()=>{
 const gate=build(async()=>false);
 await assert.rejects(()=>gate(args),/guardian_challenge_reused_or_expired/);
});
test('submitter cannot approve own document',async()=>{
 await assert.rejects(()=>build()({...args,subject:'sender'}),/evidence_not_reviewable/);
});
test('mismatched evidence digest fails',async()=>{
 const gate=createGuardianProofGate({loadEvidence:async()=>record,consumeChallenge:async()=>true,
  verifyWebAuthn:async({subject,reference,decision,revision})=>({verified:true,subject,reference,decision,revision,digest:'mismatch',challengeId:'c',credentialId:'d'})});
 await assert.rejects(()=>gate(args),/guardian_signature_invalid/);
});
