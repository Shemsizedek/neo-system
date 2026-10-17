import test from 'node:test';
import assert from 'node:assert/strict';
import {createWirePasskeyStagingHandler} from './wire-passkey-staging-factory.mjs';
const req={method:'POST',headers:{origin:'https://wire.holytemples.org','content-type':'application/json','sec-fetch-site':'same-origin'}};
const dependencies={
 enabled:true,environment:'staging',
 subjectResolver:()=> 'trusted',
 authService:{session:async subject=>({subject,neopassStatus:'authenticated'})},
 verifier:{verifyRegistration:async()=>{},verifyAuthentication:async()=>{}},
 challengeStore:{issue:async()=>{},consumeVerified:async()=>{}},
 credentialRegistry:{register:async()=>{},getForVerification:async()=>{},updateCounter:async()=>{}},
 rateLimit:async()=>true,audit:async()=>{},
 service:{beginRegistration:async args=>args}
};
test('staging factory remains disabled by default',async()=>{
 const handler=createWirePasskeyStagingHandler();
 assert.equal((await handler({req,action:'registration.begin'})).status,404);
});
test('enabled factory requires verified session service',()=>{
 assert.throws(()=>createWirePasskeyStagingHandler({...dependencies,authService:null}),/verified_neopass_session_service_required/);
});
test('enabled factory rejects missing security dependency',()=>{
 assert.throws(()=>createWirePasskeyStagingHandler({...dependencies,verifier:null}),/wire_passkey_dependency_missing:verifier/);
});
test('production requires explicit certification',()=>{
 assert.throws(()=>createWirePasskeyStagingHandler({...dependencies,environment:'production'}),/wire_passkey_production_not_certified/);
});
test('enabled staging handler binds identity to NEOpass session',async()=>{
 const handler=createWirePasskeyStagingHandler(dependencies);
 const result=await handler({req,action:'registration.begin',payload:{memberId:'untrusted'}});
 assert.equal(result.status,200);assert.equal(result.body.memberId,'trusted');
});
