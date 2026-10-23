import test from 'node:test';
import assert from 'node:assert/strict';
import {createWirePasskeyRouteHandler} from './wire-passkey-route-handler.mjs';
const req={method:'POST',headers:{origin:'https://wire.holytemples.org','content-type':'application/json','sec-fetch-site':'same-origin'}};
const dependencies={enabled:true,resolveMember:async()=>({id:'trusted-member'}),rateLimit:async()=>true,audit:async()=>{}};
test('passkey routes are disabled by default',async()=>{
 const handler=createWirePasskeyRouteHandler();
 assert.deepEqual(await handler({req,action:'registration.begin'}),{status:404,body:{error:'not_found'}});
});
test('routes reject missing service',async()=>{
 const handler=createWirePasskeyRouteHandler(dependencies);
 assert.equal((await handler({req,action:'registration.begin'})).status,503);
});
test('routes bind identity from server, ignoring client memberId',async()=>{
 const handler=createWirePasskeyRouteHandler({...dependencies,service:{beginRegistration:async args=>args}});
 const result=await handler({req,action:'registration.begin',payload:{memberId:'attacker'}});
 assert.equal(result.status,200);
 assert.equal(result.body.memberId,'trusted-member');
});
test('routes deny unauthenticated requests',async()=>{
 const handler=createWirePasskeyRouteHandler({...dependencies,resolveMember:async()=>null,service:{beginRegistration:async()=>({})}});
 assert.equal((await handler({req,action:'registration.begin'})).status,401);
});
test('routes reject unknown actions',async()=>{
 const handler=createWirePasskeyRouteHandler({...dependencies,service:{}});
 assert.equal((await handler({req,action:'invalid.action'})).status,404);
});
test('routes do not expose internal service errors',async()=>{
 const handler=createWirePasskeyRouteHandler({...dependencies,service:{finishAuthentication:async()=>{throw Error('internal secret')}}});
 const result=await handler({req,action:'authentication.finish',payload:{}});
 assert.deepEqual(result,{status:400,body:{error:'passkey_request_rejected'}});
});
