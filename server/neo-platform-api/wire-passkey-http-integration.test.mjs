import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {createWirePasskeyStagingHandler} from './wire-passkey-staging-factory.mjs';
import {createWirePasskeyHttpAdapter} from './wire-passkey-http-adapter.mjs';
const deps={
 enabled:true,environment:'staging',subjectResolver:()=> 'verified-subject',
 authService:{session:async subject=>({subject,neopassStatus:'authenticated'})},
 verifier:{verifyRegistration:async()=>{},verifyAuthentication:async()=>{}},
 challengeStore:{issue:async()=>{},consumeVerified:async()=>{}},
 credentialRegistry:{register:async()=>{},getForVerification:async()=>{},updateCounter:async()=>{}},
 rateLimit:async()=>true,audit:async()=>{},service:{beginRegistration:async ({memberId})=>({memberId,challenge:'test-only'})}
};
async function run(options={}){
 const body=JSON.stringify({memberId:'forged-member'});
 const req=Readable.from([Buffer.from(body)]);req.method='POST';req.url='/api/wire/passkeys/registration/begin';
 req.headers={origin:options.origin??'https://wire.holytemples.org','content-type':'application/json','sec-fetch-site':'same-origin'};
 const res={writeHead(status,headers){this.status=status;this.headers=headers},end(payload){this.body=JSON.parse(payload)}};
 const handler=createWirePasskeyStagingHandler({...deps,...options});
 await createWirePasskeyHttpAdapter({handler})(req,res);
 return res;
}
test('end-to-end staging request uses server-resolved identity',async()=>{
 const res=await run();assert.equal(res.status,200);assert.equal(res.body.memberId,'verified-subject');
});
test('end-to-end staging request rejects cross-origin requests',async()=>{
 const res=await run({origin:'https://evil.example'});assert.equal(res.status,403);
});
test('end-to-end staging request rejects absent authenticated session',async()=>{
 const res=await run({authService:{session:async()=>null}});assert.equal(res.status,401);
});
test('end-to-end staging request rejects rate-limited member',async()=>{
 const res=await run({rateLimit:async()=>false});assert.equal(res.status,429);
});
test('end-to-end staging request fails closed when audit unavailable',async()=>{
 const res=await run({audit:async()=>{throw new Error('audit offline')}});assert.equal(res.status,503);
});
