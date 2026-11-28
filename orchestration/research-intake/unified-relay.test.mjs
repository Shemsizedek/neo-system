import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createUnifiedRelay} from './unified-relay.mjs';
const hash='a'.repeat(64);
for(const authenticated of [false,true]){
 test('deny all operations before database access; authenticated='+authenticated,async()=>{
  const pool={query(){throw Error('unexpected database access')},connect(){throw Error('unexpected database access')}};
  const deny=async()=>false;
  const relay=createUnifiedRelay({pool,authenticate:async()=>authenticated?{id:'admin',agentId:'agent'}:null,authorization:{canRegister:deny,canClaim:deny,canComplete:deny,canEnroll:deny,canRevoke:deny}});
  assert.equal(await relay.register({},'task',hash),'DENIED');
  assert.equal(await relay.claim({},'task',hash),false);
  assert.equal(await relay.complete({},{task_id:'task'},Buffer.alloc(0)),false);
  assert.equal(await relay.enroll({},hash,Buffer.alloc(0),Buffer.alloc(0)),false);
  assert.equal(await relay.revoke({},'agent',hash),false);
 });
}
