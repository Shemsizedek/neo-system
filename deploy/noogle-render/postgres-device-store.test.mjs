import assert from 'node:assert/strict';
import test from 'node:test';
import { createPostgresDeviceStore } from './postgres-device-store.mjs';
function fixture({ challengeRows = 1, failInsert = false } = {}) {
 const calls = []; let released = false;
 const query = async (sql, params) => {
  calls.push({ sql, params });
  if (failInsert && sql.startsWith('INSERT')) throw Error('insert_failed');
  return { rows: [], rowCount: sql.startsWith('UPDATE noogle_connect_enrollment') ? challengeRows : 1 };
 };
 const store = createPostgresDeviceStore({query,connect:async()=>({query,release(){released=true;}})});
 return {store,calls,released:()=>released};
}
const subject = "owner'; DROP TABLE noogle_connect_devices; --";
const record = {id:'device',subject,type:'android',label:'Phone',publicKeyHash:'hash',createdAt:1};
test('list, enrollment and revocation use parameterized account-scoped SQL',async()=>{
 const f=fixture();
 await f.store.list(subject);
 await f.store.enrollAtomically({record,challenge:'nonce'});
 assert.equal(await f.store.revokeIfOwned(subject,'device',2),true);
 for(const call of f.calls)assert.ok(!call.sql.includes(subject));
 assert.match(f.calls[0].sql,/WHERE subject=\$1/);assert.equal(f.calls[0].params[0],subject);
 const challenge=f.calls.find(call=>call.sql.startsWith('UPDATE noogle_connect_enrollment'));
 assert.match(challenge.sql,/subject=\$2 AND public_key_hash=\$3/);
 assert.deepEqual(challenge.params,['nonce',subject,'hash']);
 assert.match(challenge.sql,/consumed_at IS NULL AND expires_at>NOW\(\)/);
 assert.equal(f.calls.find(call=>call.sql.startsWith('INSERT')).params[1],subject);
 assert.match(f.calls.at(-1).sql,/WHERE subject=\$1 AND id=\$2 AND revoked_at IS NULL RETURNING id/);
 assert.deepEqual(f.calls.at(-1).params,[subject,'device',2]);
 assert.deepEqual(f.calls.slice(1,5).map(call=>call.sql.split(' ')[0]),['BEGIN','UPDATE','INSERT','COMMIT']);
 assert.equal(f.released(),true);
});
test('replayed or expired challenge rolls back without inserting a device',async()=>{
 const f=fixture({challengeRows:0});
 await assert.rejects(f.store.enrollAtomically({record,challenge:'nonce'}),/challenge_invalid_or_replayed/);
 assert.equal(f.calls.some(call=>call.sql.startsWith('INSERT')),false);
 assert.equal(f.calls.at(-1).sql,'ROLLBACK');assert.equal(f.released(),true);
});
test('failed insert rolls back challenge consumption and releases client',async()=>{
 const f=fixture({failInsert:true});
 await assert.rejects(f.store.enrollAtomically({record,challenge:'nonce'}),/insert_failed/);
 assert.equal(f.calls.at(-1).sql,'ROLLBACK');assert.equal(f.released(),true);
});
test('requires a transaction-capable pool and enrollment challenge',async()=>{
 assert.throws(()=>createPostgresDeviceStore(null),/transactional_database_required/);
 assert.throws(()=>createPostgresDeviceStore({query(){}}),/transactional_database_required/);
 const f=fixture();await assert.rejects(f.store.enrollAtomically({record,challenge:''}),/challenge_required/);
 assert.equal(f.calls.length,0);
});
