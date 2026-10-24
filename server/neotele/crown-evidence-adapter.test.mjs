import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createNeoTeleCrownEvidenceAdapter} from './crown-evidence-adapter.mjs';
const bytes=Buffer.from('signed carrier contract document');
const digest='sha256:'+createHash('sha256').update(bytes).digest('hex');
const make=(record={id:'v1',asset:'NEOTELE',reviewStatus:'ACCEPTED'},document=bytes)=>createNeoTeleCrownEvidenceAdapter({
 getVaultEvidence:async()=>record,loadDocumentBytes:async()=>document});
test('verify accepted vault entry and actual document hash without asserting on-chain anchoring',async()=>{
 const result=await make()({vaultEvidenceId:'v1',expectedDigest:digest});
 assert.equal(result.contentDigestVerified,true);assert.equal(result.crownChainAnchored,false);assert.equal(result.activationAuthorized,false);
});
test('reject altered document',async()=>await assert.rejects(()=>make(undefined,Buffer.from('tampered'))({vaultEvidenceId:'v1',expectedDigest:digest}),/evidence_digest_mismatch/));
test('reject wrong asset or unaccepted review',async()=>await assert.rejects(()=>make({asset:'OTHER',reviewStatus:'ACCEPTED'})({vaultEvidenceId:'v1',expectedDigest:digest}),/vault_evidence_not_accepted/));
