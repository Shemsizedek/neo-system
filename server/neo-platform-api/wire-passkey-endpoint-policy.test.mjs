import test from 'node:test';
import assert from 'node:assert/strict';
import {authorizeWirePasskeyEndpoint} from './wire-passkey-endpoint-policy.mjs';
const req={method:'POST',headers:{origin:'https://wire.holytemples.org','content-type':'application/json','sec-fetch-site':'same-origin'}};
const base={req,resolveMember:async()=>({id:'member-1'}),rateLimit:async()=>true,audit:async()=>{}};
test('authorizes valid member with rate limiting and audit',async()=>assert.deepEqual(await authorizeWirePasskeyEndpoint(base),{ok:true,memberId:'member-1'}));
test('denies unverified session',async()=>assert.equal((await authorizeWirePasskeyEndpoint({...base,resolveMember:async()=>null})).status,401));
test('denies missing security hooks',async()=>assert.equal((await authorizeWirePasskeyEndpoint({...base,audit:null})).status,503));
test('denies rate-limited requests',async()=>assert.equal((await authorizeWirePasskeyEndpoint({...base,rateLimit:async()=>false})).status,429));
test('denies failed audit',async()=>assert.equal((await authorizeWirePasskeyEndpoint({...base,audit:async()=>{throw Error('down')}})).status,503));
test('denies wrong origin before rate-limit hook',async()=>{
 let called=false;
 const result=await authorizeWirePasskeyEndpoint({...base,req:{...req,headers:{...req.headers,origin:'https://other.example'}},rateLimit:async()=>{called=true;return true}});
 assert.equal(result.status,403);
 assert.equal(called,false);
});
