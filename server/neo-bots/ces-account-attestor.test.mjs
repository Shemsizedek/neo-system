import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,verify as verifyEd25519,randomBytes} from 'node:crypto';
import {
  createCesAccountControlAttestor,cesAccountAttestorReadiness,
  canonicalCesAccountAttestation
} from './ces-account-attestor.mjs';

const nowValue=Date.parse('2026-11-01T23:00:00.000Z');
const now=()=>nowValue;
const {privateKey,publicKey}=generateKeyPairSync('ed25519');
const goodChallenge=()=>({
  audience:'neo-bank-ces-account-link/v1',
  neoSubject:'neo:founder:000001',exchangeId:'NMNI',
  externalAccount:'NMNIBANK',challenge:randomBytes(32).toString('base64url'),
  expiresAt:new Date(nowValue+3*60*1000).toISOString()
});
const verified=async input=>({
  verified:true,source:'ces_protected_account_record',
  accountControlVerified:true,principalBindingVerified:true,
  neoSubject:input.neoSubject,exchangeId:input.exchangeId,
  externalAccount:input.externalAccount,observedAt:new Date(nowValue).toISOString()
});
const make=(fn=verified)=>createCesAccountControlAttestor({signingKey:privateKey,accountControlVerifier:fn,now});

test('trusted specific-account CES proof produces bank-compatible Ed25519 evidence',async()=>{
  const signer=make(),out=await signer.attest(goodChallenge());
  assert.equal(out.attestation.proofType,'specific-account-control-verified');
  assert.equal(out.attestation.externalAccount,'NMNIBANK');
  assert.equal(out.attestation.issuer,'neo-ces-account-attestor');
  assert.ok(verifyEd25519(null,
    Buffer.from(canonicalCesAccountAttestation(out.attestation)),
    publicKey,Buffer.from(out.signature,'base64url')));
  assert.doesNotMatch(JSON.stringify(out),/password|cookie|credential|private_key/i);
  assert.equal(signer.publicKeyPem.includes('BEGIN PUBLIC KEY'),true);
});

test('generic administrator login alone cannot sign an account ownership proof',async()=>{
  const signer=make(async input=>({
    ...await verified(input),
    accountControlVerified:false,
    adminAuthenticated:true
  }));
  await assert.rejects(signer.attest(goodChallenge()),/ces_account_control_not_verified/);
});

test('missing exact account or NEO principal binding rejects even with valid CES login',async()=>{
  for(const edit of [
    {externalAccount:'UNRELATED'}, {neoSubject:'neo:somebodyelse:000001'},
    {principalBindingVerified:false}, {source:'self_reported_admin_login'},
    {exchangeId:'XCPC'}
  ]){
    const signer=make(async input=>({...await verified(input),...edit}));
    await assert.rejects(signer.attest(goodChallenge()),/ces_account_control_not_verified/);
  }
});

test('cannot sign for unverified exchange account, changed audience or expired challenge',async()=>{
  const signer=make();
  for(const change of [
    {externalAccount:'NMNI0000'}, {exchangeId:'XCPC'},
    {audience:'another-bank'}, {challenge:'too-short'},
    {expiresAt:new Date(nowValue-1000).toISOString()}
  ]){
    await assert.rejects(signer.attest({...goodChallenge(),...change}),/invalid_ces_account_challenge/);
  }
});

test('stale upstream proof and future-dated observations do not sign',async()=>{
  for(const observedAt of [
    new Date(nowValue-61000).toISOString(),
    new Date(nowValue+31000).toISOString()
  ]){
    const signer=make(async input=>({...await verified(input),observedAt}));
    await assert.rejects(signer.attest(goodChallenge()),/ces_account_control_not_verified/);
  }
});

test('signing key and approved server verifier are mandatory and never auto-enabled',()=>{
  assert.throws(()=>createCesAccountControlAttestor({
    signingKey:'invalid',accountControlVerifier:verified
  }),/ces_attestor_key_not_configured/);
  assert.throws(()=>createCesAccountControlAttestor({signingKey:privateKey}),
    /ces_account_control_verifier_not_configured/);
  assert.deepEqual(cesAccountAttestorReadiness({}).enabled,false);
  assert.equal(cesAccountAttestorReadiness({}).signingKeyConfigured,false);
  assert.equal(cesAccountAttestorReadiness({NEO_CES_ATTESTOR_PRIVATE_KEY_PEM:'dummy'}).enabled,false);
  assert.equal(cesAccountAttestorReadiness({}).financialWritesEnabled,false);
});

test('XCPC supports exact XCPCBANK with independent control proof, not generic NMNI data',async()=>{
  const challenge={...goodChallenge(),exchangeId:'XCPC',externalAccount:'XCPCBANK'};
  const signed=await make().attest(challenge);
  assert.equal(signed.attestation.exchangeId,'XCPC');
  assert.equal(signed.attestation.externalAccount,'XCPCBANK');
});
