import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {captureSourceCustody,signInternalCustodyReview} from '../../server/neo-property-manager/source-attestation.mjs';
import {createCustodyAuthorizationGate,inspectNeopassPropertyManagerReadiness} from '../../server/neo-property-manager/neopass-custody-gate.mjs';

const clock=Date.parse('2026-11-11T08:55:00Z');
const makeDate=(offset)=>new Date(clock+offset).toISOString();
const keys=generateKeyPairSync('ed25519');
const trustedReviewerKeys={'DEMO-KEY':keys.publicKey.export({type:'spki',format:'pem'})};
const source=captureSourceCustody({assetRef:'DEMO-2502',sourceId:'DEMO-HCAD',
  originChannel:'HCAD_EMAIL_ATTACHMENT',importedAt:makeDate(-60_000),
  originalBytes:Buffer.concat([Buffer.from('%PDF-1.7\n'),Buffer.alloc(200,1)])});
const signed=signInternalCustodyReview({receipt:source,reviewerId:'neopass:reviewer001',
  reviewerKeyId:'DEMO-KEY',reviewedAt:makeDate(-25_000),privateKey:keys.privateKey});
const session={verified:true,issuer:'NEOpass',passkeyStepUpVerified:true,serviceLinked:true,
  subject:'neopass:reviewer001',sessionId:'session-Demo1',authenticatedAt:makeDate(-30_000),
  expiresAt:makeDate(120_000)};
const grant={subject:session.subject,status:'active',revoked:false,role:'custody-reviewer',
  reviewerKeyId:'DEMO-KEY',scopes:['neo.property.custody.review']};
const authArgs={sessionToken:'opaque-verified-session',challengeNonce:'fakechallengeNONCE1234567890',receipt:source,review:signed};
function fixture({s=session,g=grant,seen=new Set(),verifySession,lookupGrant}={}) {
  const auth=createCustodyAuthorizationGate({
    verifySession:verifySession || (async () => s),
    lookupGrant:lookupGrant || (async () => g),
    consumeNonce:async ({nonce})=>seen.has(nonce)?false:(seen.add(nonce),true),
    now:()=>clock,trustedReviewerKeys
  });
  return {auth,seen};
}
test('connected ChatGPT NEOpass without stepup or linked service is not custody-ready',()=>{
  const a=inspectNeopassPropertyManagerReadiness({connected:true,passkeyEnrolled:true,
    passkeyVerified:false,pluginPasskeyStepUp:false,legacyAccountLinked:false,
    credentialVault:{configured:false}}, {legacyAccountLinked:false,services:[]});
  assert.equal(a.readyForCustodyApproval,false);
  assert.equal(a.checks.connection,true);
  assert.equal(a.checks.servicePermission,false);
  assert.equal(a.propertyEntryAuthorized,false);
});
test('only verified session plus registry grant and signed custody review can pass',async()=>{
  const result=await fixture().auth(authArgs);
  assert.equal(result.allowed,true);assert.equal(result.status,'CUSTODY_REVIEW_APPROVED_ONLY');
  assert.equal(result.titleAccepted,false);assert.equal(result.managementAuthority,false);
  assert.equal(result.bitcoinPublicationAuthorized,false);
});
test('unverified passkey or missing service link fails closed',async()=>{
  assert.equal((await fixture({s:{...session,passkeyStepUpVerified:false}}).auth(authArgs)).allowed,false);
  assert.equal((await fixture({s:{...session,serviceLinked:false}}).auth(authArgs)).allowed,false);
});
test('self-asserted token role cannot override the authoritative registry',async()=>{
  const withRoleClaim={...session,role:'custody-reviewer',scopes:['neo.property.custody.review']};
  const result=await fixture({s:withRoleClaim,g:{...grant,role:'member'}}).auth(authArgs);
  assert.equal(result.allowed,false);
});
test('revoked, stale or expired session cannot authorize',async()=>{
  assert.equal((await fixture({g:{...grant,revoked:true}}).auth(authArgs)).allowed,false);
  assert.equal((await fixture({s:{...session,authenticatedAt:makeDate(-700_000)}}).auth(authArgs)).allowed,false);
  assert.equal((await fixture({s:{...session,expiresAt:makeDate(-1)}}).auth(authArgs)).allowed,false);
});
test('untrusted signed reviewer or mismatching attestation is rejected',async()=>{
  const wrong=signInternalCustodyReview({receipt:source,reviewerId:session.subject,
    reviewerKeyId:'DEMO-KEY',reviewedAt:makeDate(-25_000),privateKey:generateKeyPairSync('ed25519').privateKey});
  assert.equal((await fixture().auth({...authArgs,review:wrong})).allowed,false);
  assert.equal((await fixture().auth({...authArgs,receipt:{...source,sourceId:'ALTERED'}})).allowed,false);
});
test('nonce replay is rejected even for a previously verified session',async()=>{
  const {auth}=fixture();
  assert.equal((await auth(authArgs)).allowed,true);
  assert.equal((await auth(authArgs)).allowed,false);
});
test('missing verifier dependencies or failed registry calls refuse approval',async()=>{
  assert.throws(()=>createCustodyAuthorizationGate({}),/backends/);
  assert.equal((await fixture({verifySession:async()=>{throw Error('down')}}).auth(authArgs)).allowed,false);
  assert.equal((await fixture({lookupGrant:async()=>{throw Error('down')}}).auth(authArgs)).allowed,false);
});
