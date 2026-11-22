import test from 'node:test';
import assert from 'node:assert/strict';
import {createPostgresCeremonyStore,SQL_STATEMENTS} from './postgres-ceremony-store.mjs';
const rpId='connect.example.test',origin='https://'+rpId;
const subject='synthetic-member',sessionKey='synthetic-session-id-0123456789';
let now=1000000,fail=false;
const rows=new Map();
const pool={async query(sql,params){
  if (fail) throw Error('offline_db');
  const key=params[0];
  if (sql===SQL_STATEMENTS.INSERT) {
    const previous=rows.get(key);
    if (previous && previous.consumed_at===null && previous.expires_at>params[4]) return {rowCount:0,rows:[]};
    rows.set(key,{kind:params[1],challenge:params[2],expires_at:params[3],consumed_at:null});
    return {rowCount:1,rows:[{binding_hash:key}]};
  }
  if (sql===SQL_STATEMENTS.TAKE) {
    const row=rows.get(key);
    if (!row || row.kind!==params[2] || row.consumed_at!==null || row.expires_at<=params[1]) return {rowCount:0,rows:[]};
    row.consumed_at=params[1];
    return {rowCount:1,rows:[row]};
  }
  throw Error('unexpected_query');
}};
const scope={subject,sessionKey,kind:'registration'};
const s=()=>createPostgresCeremonyStore({pool,hmacKey:Buffer.alloc(32,9),rpId,origin,now:()=>now});
const data=(overrides={})=>({...scope,challenge:'A'.repeat(43),expiresAt:now+120000,...overrides});
function reset(){rows.clear();now=1000000;fail=false;}
test('requires a trusted database, HMAC key and exact RP origin',()=>{
  assert.throws(()=>createPostgresCeremonyStore(),/configuration_required/);
  assert.throws(()=>createPostgresCeremonyStore({pool,hmacKey:Buffer.alloc(4),rpId,origin}),/configuration_required/);
  assert.throws(()=>createPostgresCeremonyStore({pool,hmacKey:Buffer.alloc(32),rpId,origin:'https://wrong.example'}),/configuration_required/);
});
test('issues and consumes a registration nonce exactly once',async()=>{
  reset();const store=s();await store.put(data());const result=await store.take(scope);
  assert.equal(result.challenge,'A'.repeat(43));assert.equal(await store.take(scope),null);
});
test('refuses a second pending issuance',async()=>{
  reset();const store=s();await store.put(data());
  await assert.rejects(store.put(data({challenge:'B'.repeat(43)})),/already_pending/);
});
test('rejects replay from a different account',async()=>{
  reset();const store=s();await store.put(data());
  assert.equal(await store.take({...scope,subject:'different'}),null);
  assert.ok(await store.take(scope));
});
test('rejects replay from a different session',async()=>{
  reset();const store=s();await store.put(data());
  assert.equal(await store.take({...scope,sessionKey:'another-session-id-0123456789'}),null);
  assert.ok(await store.take(scope));
});
test('registration and authentication binding cannot be interchanged',async()=>{
  reset();const store=s();await store.put(data());
  assert.equal(await store.take({...scope,kind:'authentication'}),null);
  assert.ok(await store.take(scope));
});
test('allows next challenge after the previous one is consumed',async()=>{
  reset();const store=s();await store.put(data());await store.take(scope);
  await store.put(data({challenge:'B'.repeat(43)}));
  assert.equal((await store.take(scope)).challenge,'B'.repeat(43));
});
test('expires nonces and permits a fresh issuance',async()=>{
  reset();const store=s();await store.put(data({expiresAt:now+10}));now+=11;
  assert.equal(await store.take(scope),null);
  await store.put(data({challenge:'C'.repeat(43)}));
  assert.equal((await store.take(scope)).challenge,'C'.repeat(43));
});
test('rejects excessively long TTL and invalid nonce',async()=>{
  reset();const store=s();
  await assert.rejects(store.put(data({expiresAt:now+300001})),/invalid_ceremony_challenge/);
  await assert.rejects(store.put(data({challenge:'small'})),/invalid_ceremony_challenge/);
});
test('rejects invalid session and purpose',async()=>{
  reset();const store=s();
  await assert.rejects(store.put(data({sessionKey:'no'})),/invalid_ceremony_scope/);
  await assert.rejects(store.take({...scope,kind:'recover'}),/invalid_ceremony_scope/);
});
test('database failure is rejected, never interpreted as success',async()=>{
  reset();const store=s();await store.put(data());fail=true;
  await assert.rejects(store.take(scope),/offline_db/);fail=false;
  assert.ok(await store.take(scope));
});
test('concurrent calls obtain at most one nonce',async()=>{
  reset();const store=s();await store.put(data());
  const outcomes=await Promise.all(Array.from({length:24},()=>store.take(scope)));
  assert.equal(outcomes.filter(Boolean).length,1);
});
test('stores an HMAC binding, never a raw session or account',async()=>{
  reset();await s().put(data());const id=[...rows.keys()][0];
  assert.match(id,/^[0-9a-f]{64}$/);assert.ok(!id.includes(subject));assert.ok(!id.includes(sessionKey));
});
test('uses parameterized single-statement atomic SQL',()=>{
  assert.match(SQL_STATEMENTS.INSERT,/\$1/);
  assert.match(SQL_STATEMENTS.TAKE,/UPDATE neopass_staging_ceremonies/);
  assert.match(SQL_STATEMENTS.TAKE,/consumed_at IS NULL/);
  assert.match(SQL_STATEMENTS.TAKE,/RETURNING kind, challenge, expires_at/);
});
