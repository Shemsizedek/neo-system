import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {captureSourceCustody,signInternalCustodyReview,verifyInternalCustodyReview,controllerAndDebtGate} from '../../server/neo-property-manager/source-attestation.mjs';

const bytes=Buffer.concat([Buffer.from('%PDF-1.7\n'),Buffer.alloc(256,0x41)]);
const input={assetRef:'DEMO-ALG-2502',originalBytes:bytes,sourceId:'SYNTHETIC-HCAD-EXHIBIT',
  originChannel:'HCAD_EMAIL_ATTACHMENT',importedAt:'2026-11-10T16:25:41Z'};
const pair=generateKeyPairSync('ed25519');
const other=generateKeyPairSync('ed25519');
const trusted={'TEST-INTERNAL-REVIEWER':pair.publicKey.export({type:'spki',format:'pem'})};
function attestation(rec){return signInternalCustodyReview({receipt:rec,reviewerId:'TEST-PERSON',
  reviewerKeyId:'TEST-INTERNAL-REVIEWER',reviewedAt:'2026-11-10T18:10:00Z',privateKey:pair.privateKey});}

test('PDF bytes yield a custody receipt without legal title conclusions',()=>{
  const rec=captureSourceCustody(input);
  assert.match(rec.sourceHash,/^[a-f0-9]{64}$/);
  assert.equal(rec.byteLength,bytes.length);
  assert.equal(rec.legalTitleStatus,'NOT_VERIFIED');
  assert.equal(rec.governmentIssuerSignature,'NOT_AUTHENTICATED');
  assert.equal(rec.externalAction,'NONE');
});
test('wrong hash or altered source fails',()=>{
  assert.throws(()=>captureSourceCustody({...input,expectedHash:'0'.repeat(64)}),/mismatch/);
  assert.throws(()=>captureSourceCustody({...input,originalBytes:Buffer.from('not a PDF')}),/PDF/);
});
test('trusted Ed25519 signature verifies internal custody only',()=>{
  const rec=captureSourceCustody(input);const signed=attestation(rec);
  assert.equal(verifyInternalCustodyReview({receipt:rec,review:signed,trustedPublicKeys:trusted}),true);
  assert.equal(signed.payload.governmentSourceAuthenticated,false);
  assert.equal(signed.payload.propertyTitleAccepted,false);
});
test('untrusted key, tampered receipt, altered statement are rejected',()=>{
  const rec=captureSourceCustody(input);const signed=attestation(rec);
  assert.equal(verifyInternalCustodyReview({receipt:rec,review:signed,trustedPublicKeys:{}}),false);
  assert.equal(verifyInternalCustodyReview({receipt:{...rec,sourceId:'altered'},review:signed,trustedPublicKeys:trusted}),false);
  assert.equal(verifyInternalCustodyReview({receipt:rec,review:{...signed,payload:{...signed.payload,governmentSourceAuthenticated:true}},trustedPublicKeys:trusted}),false);
  assert.equal(verifyInternalCustodyReview({receipt:rec,review:signed,trustedPublicKeys:{'TEST-INTERNAL-REVIEWER':other.publicKey}}),false);
});
test('even a substantiated debt lead does not automatically grant possession',()=>{
  const rec=captureSourceCustody(input);
  const gate=controllerAndDebtGate({custody:rec,reviewVerified:true,certifiedDeed:true,controllerVerified:true,
    recordedLienVerified:true,lenderAssignmentVerified:true,officialForeclosureNoticeVerified:true});
  assert.equal(gate.genuineSecuredDebtLead,true);
  assert.equal(gate.propertyAcquired,false);
  assert.equal(gate.propertyEntryAuthorized,false);
  assert.equal(gate.managementActive,false);
});
