import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createNeoTeleTokenizedEsimStaging} from './tokenized-esim-staging.mjs';
const bytes=Buffer.from('carrier due diligence sample');
const hash=x=>'sha256:'+createHash('sha256').update(x).digest('hex');
const subject='chaplain-1',reference='approval-1',digest=hash(bytes);
const adapters={
 vault:{getEvidence:async()=>({asset:'NEOTELE',reviewStatus:'ACCEPTED'})},
 loadDocumentBytes:async()=>bytes,
 resolveSession:async()=>({verified:true,subject}),
 loadMembership:async()=>({verified:true,subject,status:'ACTIVE',cohort:'chaplaincy'}),
 loadEvidence:async()=>({status:'PENDING_REVIEW',submitter:'another',revision:1,digest}),
 verifyWebAuthn:async({subject,reference,decision,revision,digest})=>({verified:true,subject,reference,decision,revision,digest,challengeId:'nonce',credentialId:'credential'}),
 consumeChallenge:async()=>true
};
const params={sessionToken:'trusted',reference,assertion:{response:'sample'},vaultEvidenceId:'vault-1',expectedDigest:digest};
test('authenticated chaplain with Guardian and real document hash reaches manual review only',async()=>{
 const service=createNeoTeleTokenizedEsimStaging(adapters);
 const result=await service.certify(params);
 assert.equal(result.readyForManualReview,true);
 assert.equal(result.productionEnabled,false);
 await assert.rejects(()=>service.activate(),/ESIM_PROVISIONING_DISABLED/);
});
test('reject replay and mismatched documents',async()=>{
 await assert.rejects(()=>createNeoTeleTokenizedEsimStaging({...adapters,consumeChallenge:async()=>false}).certify(params),/guardian_challenge_reused/);
 await assert.rejects(()=>createNeoTeleTokenizedEsimStaging({...adapters,loadDocumentBytes:async()=>Buffer.from('modified')}).certify(params),/evidence_digest_mismatch/);
});
test('entitlement draft never embeds cellular secrets or claims chain publication',()=>{
 const service=createNeoTeleTokenizedEsimStaging(adapters);
 const e=service.createEntitlementDraft({memberPseudonym:hash('member'),deviceBindingHash:hash('device')});
 assert.equal(e.networkPublished,false);assert.equal(e.carrierProfileIssued,false);assert.equal(e.transferable,false);
 assert.equal(e.txid,null);assert.equal(e.activationEnabled,false);
 assert.equal(Object.keys(e).some(k=>['eid','iccid','imsi','activationCode','phoneNumber'].includes(k)),false);
});
