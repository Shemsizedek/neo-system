import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign,createHash} from 'node:crypto';
import {captureAppraisalRecord} from '../../server/neo-property-manager/hcad-readonly-evidence.mjs';
import {canonicalBytes,stageReviewerAttestation,verifyReviewerSignature,
  stageRedactedCommitment,verifyRedactedCommitment} from '../../server/neo-property-manager/private-source-attestation.mjs';

const bytes=Buffer.concat([Buffer.from('%PDF-1.7\n'),Buffer.alloc(200,0x44)]);
const source=captureAppraisalRecord({
  account:'0772210030001',sourceBytes:bytes,sourceMailboxReference:'TEST-MAIL-1',
  receivedAt:'2026-11-10T16:25:41Z',reportedOwner:'SYNTHETIC OWNER LLC',
  reportedOwnerEffectiveDate:'2026-06-24',reportedAppraisedValue:2989249
});
const reviewerId='test-reviewer-001';
const keys=generateKeyPairSync('ed25519');
const registry={
  [reviewerId]:{role:'records-reviewer',enabled:true,
    publicKeyPem:keys.publicKey.export({type:'spki',format:'pem'})}
};
const build=()=>stageReviewerAttestation({sourceReceipt:source,sourceBytes:bytes,
  reviewerId,reviewedAt:'2026-11-12T21:00:00Z'});
test('matching HCAD bytes support a private source inspection attestation, not title',()=>{
  const a=build();
  assert.equal(a.sourceDigest,source.sourceHash);
  assert.equal(a.titleVerified,false);
  assert.equal(a.bitcoinPublished,false);
  assert.equal(a.custodyOrCustodianSignatureVerified,false);
  assert.equal(a.legalEffect,'NONE_INFERRED');
});
test('altered PDF bytes cannot be attested',()=>{
  const bad=Buffer.from(bytes);bad[bad.length-1]^=0xff;
  assert.throws(()=>stageReviewerAttestation({sourceReceipt:source,sourceBytes:bad,
    reviewerId,reviewedAt:'2026-11-12T21:00:00Z'}),/digest mismatch/);
});
test('enrolled reviewer Ed25519 signature authenticates exactly the private claim',()=>{
  const a=build();
  const sig=sign(null,canonicalBytes(a),keys.privateKey).toString('base64');
  assert.equal(verifyReviewerSignature({attestation:a,signatureBase64:sig,trustedReviewers:registry}),true);
  assert.equal(verifyReviewerSignature({attestation:{...a,sourceDigest:'00'.repeat(32)},
    signatureBase64:sig,trustedReviewers:registry}),false);
});
test('untrusted and disabled reviewers cannot authenticate a source claim',()=>{
  const a=build(); const sig=sign(null,canonicalBytes(a),keys.privateKey).toString('base64');
  assert.equal(verifyReviewerSignature({attestation:a,signatureBase64:sig,trustedReviewers:{}}),false);
  assert.equal(verifyReviewerSignature({attestation:a,signatureBase64:sig,trustedReviewers:{
    [reviewerId]:{...registry[reviewerId],enabled:false}}}),false);
});
test('public redacted commitment reveals no account, owner or document hash',()=>{
  const a=build(); const nonce='cc'.repeat(32);
  const receipt=stageRedactedCommitment({attestation:a,secretNonce:nonce});
  assert.deepEqual(Object.keys(receipt).sort(),
    ['schema','commitment','status','legalEffect'].sort());
  assert.equal(JSON.stringify(receipt).includes('SYNTHETIC OWNER LLC'),false);
  assert.equal(Object.hasOwn(receipt,'sourceAccount'),false);
  assert.equal(Object.hasOwn(receipt,'sourceDigest'),false);
  assert.equal(receipt.status,'NOT_PUBLISHED');
  assert.equal(verifyRedactedCommitment({receipt,attestation:a,secretNonce:nonce}),true);
});
test('wrong nonce or changed private claim fails public commitment verification',()=>{
  const a=build(),nonce='aa'.repeat(32);
  const receipt=stageRedactedCommitment({attestation:a,secretNonce:nonce});
  assert.equal(verifyRedactedCommitment({receipt,attestation:a,secretNonce:'bb'.repeat(32)}),false);
  assert.equal(verifyRedactedCommitment({receipt,attestation:{...a,assetRef:'ALTERED'},secretNonce:nonce}),false);
});
test('reject untrusted review scope and invalid receipt',()=>{
  assert.throws(()=>stageReviewerAttestation({sourceReceipt:source,sourceBytes:bytes,
    reviewerId,reviewScope:'DEED_TITLE_CERTIFIED',reviewedAt:'2026-11-12T21:00:00Z'}),/review scope/);
  assert.throws(()=>stageRedactedCommitment({attestation:build(),secretNonce:'bad'}),/nonce/);
});
