import test from 'node:test';
import assert from 'node:assert/strict';
import {authorizeWirePasskeyRequest,authorizeWirePasskeySession} from './wire-passkey-http-guard.mjs';
const request=(headers={},method='POST')=>({method,headers:{origin:'https://wire.holytemples.org','content-type':'application/json','sec-fetch-site':'same-origin',...headers}});
const member={id:'member-1'};
test('reject missing session',()=>assert.equal(authorizeWirePasskeyRequest({req:request()}).status,401));
test('reject cross-site origin',()=>assert.equal(authorizeWirePasskeyRequest({req:request({origin:'https://evil.example'}),member}).status,403));
test('reject cross-site fetch metadata',()=>assert.equal(authorizeWirePasskeyRequest({req:request({'sec-fetch-site':'cross-site'}),member}).status,403));
test('reject unsupported methods',()=>assert.equal(authorizeWirePasskeyRequest({req:request({},'GET'),member}).status,405));
test('reject non-json content',()=>assert.equal(authorizeWirePasskeyRequest({req:request({'content-type':'text/plain'}),member}).status,415));
test('allow scoped member request',()=>assert.deepEqual(authorizeWirePasskeyRequest({req:request(),member}),{ok:true,memberId:'member-1'}));

test('session wrapper rejects unavailable resolver',async()=>{
 const result=await authorizeWirePasskeySession({req:request()});
 assert.equal(result.status,503);
});
test('session wrapper rejects invalid sessions',async()=>{
 const result=await authorizeWirePasskeySession({req:request(),resolveMember:async()=>{throw new Error('expired')}});
 assert.equal(result.status,401);
});
test('session wrapper uses server resolved identity',async()=>{
 const result=await authorizeWirePasskeySession({req:request(),resolveMember:async()=>({id:'server-member'})});
 assert.deepEqual(result,{ok:true,memberId:'server-member'});
});
