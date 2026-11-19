import assert from 'node:assert/strict';
import test from 'node:test';
import {createPostgresNeoKeyStore} from './neo-key-postgres-store.mjs';
function dbFixture({duplicate=false}={}){
  const calls=[];let released=0;
  const query=async(sql,args=[])=>{
    calls.push({sql,args});
    if(sql.startsWith('SELECT user_handle')) return {rows:[{user_handle:'X'.repeat(43)}]};
    if(sql.includes('UPDATE neo_key_registration_challenges'))return {rows:[{enrollment_method:'verified-existing-passkey'}]};
    if(sql.includes('INSERT INTO neo_key_credentials'))return {rows:duplicate?[]:[{credential_id:'key-12345678'}]};
    if(sql.includes('SELECT credential_id FROM neo_key_credentials'))return {rows:[{credential_id:'key-12345678'},{credential_id:'backup-98765'}]};
    if(sql.includes('UPDATE neo_key_credentials'))return {rows:[{credential_id:'key-12345678'}]};
    return {rows:[]};
  };
  const pool={query,async connect(){return {query,release(){released++;}};}};
  return {store:createPostgresNeoKeyStore(pool),calls,releases:()=>released};
}
test('user handle is stable via conditional insert and bound parameters',async()=>{
  const f=dbFixture();const subject="a' ; DROP TABLE neo_key_credentials; --";
  assert.equal(await f.store.getOrCreateUserHandle(subject,'X'.repeat(43)),'X'.repeat(43));
  assert.ok(f.calls.every(c=>!c.sql.includes(subject)));
  assert.match(f.calls[0].sql,/ON CONFLICT\(subject_id\) DO NOTHING/);
});
test('registration runs all steps in a transaction and writes audit event',async()=>{
  const f=dbFixture();
  assert.equal(await f.store.registerAtomic({subject:'member-1',challengeHash:'a'.repeat(64),rpId:'connect.example.test',origin:'https://connect.example.test',
    now:1000,credentialId:'key-12345678',publicKeyPem:'PUBLIC KEY',signCount:0}),true);
  assert.equal(f.calls[0].sql,'BEGIN');
  assert.equal(f.calls.at(-1).sql,'COMMIT');
  assert.ok(f.calls.some(c=>c.sql.includes('advisory_xact_lock')));
  assert.ok(f.calls.some(c=>c.sql.includes('consumed_at IS NULL')));
  assert.ok(f.calls.some(c=>c.sql.includes('neo_key_audit_events')));
  assert.equal(f.releases(),1);
});
test('duplicate credential rolls back challenge consumption',async()=>{
  const f=dbFixture({duplicate:true});
  await assert.rejects(()=>f.store.registerAtomic({subject:'member-1',challengeHash:'b'.repeat(64),rpId:'connect.example.test',origin:'https://connect.example.test',now:1000,credentialId:'key-12345678',publicKeyPem:'PUBLIC KEY',signCount:0}),/neo_key_duplicate_credential/);
  assert.equal(f.calls.at(-1).sql,'ROLLBACK');
  assert.equal(f.releases(),1);
});
test('recovery requires distinct active credentials and logs revocation atomically',async()=>{
  const f=dbFixture();
  assert.equal(await f.store.revokeAtomic({subject:'member-1',rpId:'connect.example.test',targetCredentialId:'key-12345678',backupCredentialId:'backup-98765',now:1000}),true);
  assert.equal(f.calls[0].sql,'BEGIN');
  assert.ok(f.calls.some(c=>c.sql.includes('FOR UPDATE')));
  assert.ok(f.calls.some(c=>c.sql.includes("'revoked'")));
  assert.equal(f.calls.at(-1).sql,'COMMIT');
  const g=dbFixture();
  assert.equal(await g.store.revokeAtomic({subject:'member-1',rpId:'connect.example.test',targetCredentialId:'key-12345678',backupCredentialId:'key-12345678',now:1000}),false);
  assert.equal(g.calls.length,0);
});
