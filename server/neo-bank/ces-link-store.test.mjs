import assert from 'node:assert/strict';
import test from 'node:test';
import {prepareCesAccountLink} from './ces-links.mjs';
import {createNeoBankCesLinkStore,migrateNeoBankCesLinkStore} from './ces-link-store.mjs';

const timestamp='2026-11-01T21:00:00.000Z';
const verifiedAt='2026-11-01T20:59:00.000Z';
const pending=()=>prepareCesAccountLink({
  neoSubject:'neo:founder:000001',exchangeId:'NMNI',externalAccount:'NMNIBANK'
});
const goodVerifier=async({neoSubject,exchangeId,externalAccount})=>({
  verified:true,neoSubject,exchangeId,externalAccount,verifiedAt
});
const row={
  neo_subject:'neo:founder:000001',
  exchange_id:'NMNI',
  external_account:'NMNIBANK',
  status:'verified_identifier_only',
  verified_at:verifiedAt,
  verification_source:'authorized_ces_server'
};

test('migration defines a unique external-account owner and no financial access fields',async()=>{
  const queries=[];
  await migrateNeoBankCesLinkStore({query:async sql=>queries.push(sql)});
  assert.equal(queries.length,1);
  const sql=queries[0];
  assert.match(sql,/CREATE TABLE IF NOT EXISTS neo_bank_ces_links/);
  assert.match(sql,/PRIMARY KEY\(exchange_id, external_account\)/);
  assert.match(sql,/REFERENCES neo_bank_accounts\(subject\)/);
  assert.match(sql,/CHECK \(status = 'verified_identifier_only'\)/);
  assert.doesNotMatch(sql,/password|balance|session_token|credit_limit|transfer_amount|DELETE FROM|DROP TABLE/i);
});

test('only fresh account-specific trusted verification may create a link',async()=>{
  const calls=[];
  const pool={query:async(sql,params)=>{calls.push({sql,params});return {rows:[row]}}};
  const store=createNeoBankCesLinkStore({
    pool,verifyCesOwnership:goodVerifier,now:()=>Date.parse(timestamp)
  });
  const result=await store.verifyAndPersist(pending(),{opaqueEvidence:'secret-must-not-store'});
  assert.equal(result.status,'verified_identifier_only');
  assert.deepEqual(result.permissions,{read:false,transfer:false,issuance:false});
  assert.equal(calls.length,1);
  assert.match(calls[0].sql,/ON CONFLICT \(exchange_id,external_account\)/);
  assert.match(calls[0].sql,/neo_bank_ces_links.neo_subject=EXCLUDED.neo_subject/);
  assert.deepEqual(calls[0].params,[
    'neo:founder:000001','NMNI','NMNIBANK','verified_identifier_only',
    verifiedAt,'authorized_ces_server'
  ]);
  assert.doesNotMatch(JSON.stringify({result,calls}),/secret-must-not-store/);
});

test('admin-only proof cannot masquerade as ownership of NMNIBANK',async()=>{
  let writes=0;
  const pool={query:async()=>{writes++;return {rows:[row]}}};
  const wrongProof=async()=>({verified:true,exchangeId:'NMNI',
    memberAuthenticated:true,adminAuthenticated:true,verifiedAt});
  const store=createNeoBankCesLinkStore({pool,verifyCesOwnership:wrongProof,now:()=>Date.parse(timestamp)});
  await assert.rejects(store.verifyAndPersist(pending(),{adminLoggedIn:true}),/ces_account_verification_failed/);
  assert.equal(writes,0);
});

test('missing trusted verifier and expired proof reject without writing',async()=>{
  let writes=0;
  const pool={query:async()=>{writes++;return {rows:[row]}}};
  await assert.rejects(createNeoBankCesLinkStore({pool}).verifyAndPersist(pending(),{}),
    /trusted_ces_verification_required/);
  const expired=createNeoBankCesLinkStore({pool,verifyCesOwnership:goodVerifier,
    now:()=>Date.parse(timestamp)+6*60*1000});
  await assert.rejects(expired.verifyAndPersist(pending(),{}),/ces_account_proof_expired/);
  const future=createNeoBankCesLinkStore({pool,verifyCesOwnership:goodVerifier,
    now:()=>Date.parse(verifiedAt)-2*60*1000});
  await assert.rejects(future.verifyAndPersist(pending(),{}),/ces_account_proof_expired/);
  assert.equal(writes,0);
});

test('CES accounts already linked to another NEO subject cannot be reassigned',async()=>{
  const pool={query:async()=>({rows:[]})};
  const store=createNeoBankCesLinkStore({pool,verifyCesOwnership:goodVerifier,
    now:()=>Date.parse(timestamp)});
  await assert.rejects(store.verifyAndPersist(pending(),{}),/ces_link_conflict_or_stale_proof/);
});

test('subject-scoped lookup returns identifier-only records',async()=>{
  const seen=[];
  const pool={query:async(sql,params)=>{seen.push({sql,params});return {rows:[row]}}};
  const store=createNeoBankCesLinkStore({pool});
  const links=await store.linksForSubject('neo:founder:000001');
  assert.deepEqual(seen[0].params,['neo:founder:000001']);
  assert.equal(links[0].exchangeId,'NMNI');
  assert.equal(links[0].externalAccount,'NMNIBANK');
  assert.equal(links[0].neoSubject,undefined);
  assert.deepEqual(links[0].permissions,{read:false,transfer:false,issuance:false});
  await assert.rejects(store.linksForSubject(''),/invalid_neo_subject/);
  assert.equal(seen.length,1);
});
