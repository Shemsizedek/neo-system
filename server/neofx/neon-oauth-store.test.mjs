import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {createNeonOauthStore,sha256} from './neon-oauth-store.mjs';

test('enforces vault key length and database interface',()=>{
 assert.throws(()=>createNeonOauthStore({query:async()=>{},key:Buffer.alloc(10)}),/vault_key/);
 assert.throws(()=>createNeonOauthStore({key:randomBytes(32)}),/database_query/);
});
test('token bytes encrypted and tenant bound',async()=>{
 const rows=[];const q=async(sql,params)=>{
  if(sql.includes('INSERT INTO neofx_auth.broker_tokens')){rows[0]={encrypted_payload:params[2],encryption_key_version:params[3],nonce:params[4],auth_tag:params[5]};return {rows:[]};}
  if(sql.includes('SELECT encrypted_payload'))return {rows};
  return {rows:[]};
 };
 const s=createNeonOauthStore({query:q,key:randomBytes(32)});
 await s.storeToken({tenantId:'A',subjectId:'s1',token:{access_token:'token-secret'}});
 assert.equal(rows[0].encrypted_payload.includes(Buffer.from('token-secret')),false);
 assert.equal((await s.getToken({tenantId:'A',subjectId:'s1'})).access_token,'token-secret');
 await assert.rejects(s.getToken({tenantId:'other',subjectId:'s1'}),/Unsupported state or unable to authenticate data|authenticate/);
});
test('state recording hashes session identifier',async()=>{
 let params;const s=createNeonOauthStore({key:randomBytes(32),query:async(sql,p)=>{params=p;return {rows:[]};}});
 await s.createState({stateHash:sha256('state'),tenantId:'A',subjectId:'one',sessionId:'opaque-session',expiresAt:Date.now()+120000});
 assert.equal(params[3],sha256('opaque-session'));assert.notEqual(params[3],'opaque-session');
});
test('consumption requires an atomic database update',async()=>{
 const s=createNeonOauthStore({key:randomBytes(32),query:async()=>({rows:[]})});
 assert.equal(await s.consumeState({stateHash:sha256('state'),tenantId:'A',subjectId:'one',sessionId:'s'}),false);
});
