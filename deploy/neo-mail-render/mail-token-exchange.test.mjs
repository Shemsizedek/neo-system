import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createMailTokenExchange} from './mail-token-exchange.mjs';
const session={subject:'member-1',active:true,sessionId:'session-1',mailboxes:['chaplain@holytemples.org']};
const request={sessionToken:'signed-session-placeholder',mailbox:'chaplain@holytemples.org',requester:'member-1'};
test('exchange requires trusted identity, issuer and revocation dependencies',()=>{
  assert.throws(()=>createMailTokenExchange({}),/exchange_dependencies_required/);
});
test('exchange refuses unauthorized and revoked sessions before issuance',async()=>{
 let issued=0;
 const make=(verifySession,isRevoked=async()=>false)=>createMailTokenExchange({verifySession,isRevoked,issueGrant:async()=>{issued++;return 'signed-grant-fixture'},now:()=>1000});
 assert.equal((await make(async()=>null)(request)).reason,'access_denied');
 assert.equal((await make(async()=>({...session,mailboxes:[]}))(request)).reason,'access_denied');
 assert.equal((await make(async()=>session,async()=>true)(request)).reason,'session_revoked');
 assert.equal((await make(async()=>session,async()=>{throw Error('storage down')})(request)).reason,'revocation_unavailable');
 assert.equal(issued,0);
});
test('authorized exchange issues short-lived mailbox-bound claims only',async()=>{
 let claims;
 const exchange=createMailTokenExchange({verifySession:async()=>session,isRevoked:async()=>false,issueGrant:async c=>{claims=c;return 'signed-grant-fixture'},now:()=>1000});
 assert.deepEqual(await exchange(request),{ok:true,grant:'signed-grant-fixture',expiresIn:300});
 assert.equal(claims.aud,'neo-mail');
 assert.equal(claims.scope,'mail:read');
 assert.equal(claims.mailbox,'chaplain@holytemples.org');
 assert.equal(claims.exp-claims.iat,300);
});
