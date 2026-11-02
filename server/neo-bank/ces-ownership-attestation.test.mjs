import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign as signEd25519} from 'node:crypto';
import {prepareCesAccountLink,attestCesAccountLink} from './ces-links.mjs';
import {createCesOwnershipVerifier,issueCesOwnershipChallenge,CES_ACCOUNT_PROOF_AUDIENCE} from './ces-ownership-attestation.mjs';
import {createCesOwnershipChallengeStore,migrateCesOwnershipChallenges} from './ces-challenge-store.mjs';

const clock=Date.parse('2026-11-01T20:00:00.000Z');
const now=()=>clock;
const pending=()=>prepareCesAccountLink({neoSubject:'neo:founder:000001',exchangeId:'NMNI',externalAccount:'NMNIBANK'});
const {publicKey,privateKey}=generateKeyPairSync('ed25519');
const attacker=generateKeyPairSync('ed25519');
const canon=claims=>[
  'neo-ces-account-control/v1',claims.issuer,claims.audience,claims.neoSubject,
  claims.exchangeId,claims.externalAccount,claims.challenge,claims.proofType,
  claims.issuedAt,claims.expiresAt
].join('\n');
const signClaims=(claims,key=privateKey)=>({
  attestation:claims,
  signature:signEd25519(null,Buffer.from(canon(claims)),key).toString('base64url')
});

function store(){
  const records=new Map();
  return {
    records,
    async put(value){assert.equal(typeof value.challengeHash,'string');records.set(value.challengeHash,value)},
    async consume(input){
      const row=records.get(input.challengeHash);
      if(!row||row.neoSubject!==input.neoSubject||row.exchangeId!==input.exchangeId||
        row.externalAccount!==input.externalAccount||Date.parse(input.now)>=Date.parse(row.expiresAt))return false;
      records.delete(input.challengeHash);return true;
    }
  };
}

async function setup(){
  const challengeStore=store(), link=pending();
  const challenge=await issueCesOwnershipChallenge(link,{
    authenticatedNeoSubject:link.neoSubject,challengeStore,now
  });
  const claims={
    issuer:'neo-ces-account-attestor',audience:CES_ACCOUNT_PROOF_AUDIENCE,
    neoSubject:link.neoSubject,exchangeId:link.exchangeId,
    externalAccount:link.externalAccount,
    challenge:challenge.challenge,
    proofType:'specific-account-control-verified',
    issuedAt:new Date(clock).toISOString(),
    expiresAt:challenge.expiresAt
  };
  return {
    challengeStore,link,challenge,claims,
    verifier:createCesOwnershipVerifier({cesPublicKey:publicKey,challengeStore,now})
  };
}

test('only an authenticated NEO principal can issue a fresh account-bound nonce',async()=>{
  const p=pending(),cs=store();
  await assert.rejects(issueCesOwnershipChallenge(p,{
    authenticatedNeoSubject:'neo:other:000001',challengeStore:cs,now
  }),/neo_identity_authentication_required/);
  await assert.rejects(issueCesOwnershipChallenge(p,{
    authenticatedNeoSubject:p.neoSubject,now
  }),/durable_challenge_store_required/);
  assert.equal(cs.records.size,0);
  const c=await issueCesOwnershipChallenge(p,{
    authenticatedNeoSubject:p.neoSubject,challengeStore:cs,now
  });
  assert.equal(c.challenge.length,43);
  assert.equal(c.externalAccount,'NMNIBANK');
  assert.equal(cs.records.size,1);
  assert.doesNotMatch(JSON.stringify([...cs.records.values()]),new RegExp(c.challenge));
});

test('a signed attestation with exact account and principal uses nonce once only',async()=>{
  const {verifier,link,claims,challengeStore}=await setup();
  const evidence=signClaims(claims);
  const result=await attestCesAccountLink(link,evidence,{verifyCesOwnership:verifier});
  assert.equal(result.status,'verified_identifier_only');
  assert.deepEqual(result.permissions,{read:false,transfer:false,issuance:false});
  assert.equal(challengeStore.records.size,0);
  await assert.rejects(verifier({neoSubject:link.neoSubject,exchangeId:link.exchangeId,
    externalAccount:link.externalAccount,evidence}),/ces_account_challenge_used_or_expired/);
});

test('signed generic administrator login cannot stand in for specific-account control',async()=>{
  const {verifier,link,claims}=await setup();
  const evidence=signClaims({...claims,proofType:'admin-login-verified'});
  await assert.rejects(attestCesAccountLink(link,evidence,{verifyCesOwnership:verifier}),
    /ces_account_verification_failed/);
});

test('cross-account, cross-subject, cross-exchange and tampered claims are rejected',async()=>{
  const {verifier,link,claims,challengeStore}=await setup();
  for(const patch of [
    {externalAccount:'XCPCBANK'},{neoSubject:'neo:attacker:000001'},
    {exchangeId:'XCPC'},{challenge:'x'.repeat(43)}
  ]){
    const evidence=signClaims({...claims,...patch});
    await assert.rejects(verifier({neoSubject:link.neoSubject,exchangeId:link.exchangeId,
      externalAccount:link.externalAccount,evidence}),/ces_account_verification_failed/);
  }
  await assert.rejects(verifier({neoSubject:link.neoSubject,exchangeId:link.exchangeId,
    externalAccount:link.externalAccount,evidence:signClaims(claims,attacker.privateKey)}),
    /ces_account_verification_failed/);
  assert.equal(challengeStore.records.size,1); // Rejected proofs do not consume challenge.
});

test('proofs expire and cannot be accepted using an untrusted or missing key',async()=>{
  const {claims,challengeStore,link}=await setup();
  const later=createCesOwnershipVerifier({cesPublicKey:publicKey,challengeStore,now:()=>clock+200000});
  await assert.rejects(later({neoSubject:link.neoSubject,exchangeId:link.exchangeId,
    externalAccount:link.externalAccount,evidence:signClaims(claims)}),
    /ces_account_proof_expired/);
  assert.throws(()=>createCesOwnershipVerifier({challengeStore}),/trusted_ces_public_key_required/);
  assert.throws(()=>createCesOwnershipVerifier({
    cesPublicKey:'not-a-key',challengeStore
  }),/trusted_ces_public_key_required/);
});

test('durable challenge schema and consume SQL require exact account and atomic deletion',async()=>{
  const seen=[];
  const pool={query:async(sql,params)=>{seen.push({sql,params});return{rows:[{challenge_hash:'a'.repeat(64)}]}}};
  await migrateCesOwnershipChallenges(pool);
  const backend=createCesOwnershipChallengeStore(pool);
  const put={
    challengeHash:'a'.repeat(64),neoSubject:'neo:founder:000001',
    exchangeId:'NMNI',externalAccount:'NMNIBANK',
    expiresAt:'2026-11-01T20:03:00.000Z'
  };
  await backend.put(put);
  assert.equal(await backend.consume({...put,now:'2026-11-01T20:01:00.000Z'}),true);
  assert.match(seen[0].sql,/CREATE TABLE IF NOT EXISTS neo_bank_ces_challenges/);
  assert.match(seen[1].sql,/INSERT INTO neo_bank_ces_challenges/);
  assert.match(seen[2].sql,/DELETE FROM neo_bank_ces_challenges/);
  assert.match(seen[2].sql,/expires_at>\$5/);
  assert.match(seen[2].sql,/RETURNING challenge_hash/);
  assert.deepEqual(seen[2].params,[
    put.challengeHash,put.neoSubject,put.exchangeId,put.externalAccount,
    '2026-11-01T20:01:00.000Z'
  ]);
  assert.doesNotMatch(seen.map(x=>x.sql).join(' '),/password|token|transfer_amount|balance|DROP TABLE/i);
});
