import assert from 'node:assert/strict';
import test from 'node:test';
import { createPostgresDeviceStore } from './postgres-device-store.mjs';

test('list and revoke use parameterized account-scoped SQL',async()=>{
 const calls=[];
 const db={connect:async()=>{throw Error('unexpected_transaction');},query:async(sql,params)=>{calls.push({sql,params});return {rows:[],rowCount:sql.startsWith('UPDATE')?1:0};}};
 const store=createPostgresDeviceStore(db);
 const attacker="owner'; DROP TABLE noogle_connect_devices; --";
 await store.list(attacker);
 assert.equal(await store.revokeIfOwned(attacker,'device',2),true);
 assert.equal(calls.length,2);
 for(const call of calls){assert.ok(call.sql.includes('$1'));assert.equal(call.params[0],attacker);assert.ok(!call.sql.includes(attacker));}
 assert.match(calls[1].sql,/revoked_at IS NULL RETURNING id/);
});
test('adapter requires a database and does not access network during import',()=>{
 assert.throws(()=>createPostgresDeviceStore(null),/database_required/);
});
