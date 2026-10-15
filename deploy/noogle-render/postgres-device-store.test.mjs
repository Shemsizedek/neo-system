import assert from 'node:assert/strict';
import test from 'node:test';
import { createPostgresDeviceStore } from './postgres-device-store.mjs';

test('all device operations use parameterized account-scoped SQL',async()=>{
 const calls=[];
 const db={query:async(sql,params)=>{calls.push({sql,params});return {rows:sql.startsWith('UPDATE')?[{id:'found'}]:[]};}};
 const store=createPostgresDeviceStore(db);
 const attacker="owner'; DROP TABLE noogle_connect_devices; --";
 await store.list(attacker);
 await store.findByKey(attacker,'hash');
 await store.insert({id:'id',subject:attacker,type:'android',label:'Phone',publicKeyHash:'hash',createdAt:1});
 assert.equal(await store.revokeIfOwned(attacker,'device',2),true);
 assert.equal(calls.length,4);
 for(const call of calls){assert.ok(call.sql.includes('$1'));assert.equal(call.params[0],attacker);assert.ok(!call.sql.includes(attacker));}
 assert.match(calls[3].sql,/revoked_at IS NULL RETURNING id/);
});
test('adapter requires a database and does not access network during import',()=>{
 assert.throws(()=>createPostgresDeviceStore(null),/database_required/);
});
