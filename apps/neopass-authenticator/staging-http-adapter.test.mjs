import test from 'node:test';
import assert from 'node:assert/strict';
import {createIsolatedStagingHttpAdapter} from './staging-http-adapter.mjs';
const rpId='connect.example.test', origin='https://'+rpId;
const subject='test-user', sessionKey='0123456789abcdefghijkl';
const cred='0123456789abcdef-credential';
const regChallenge='A'.repeat(43), authChallenge='B'.repeat(43);
const paths={reg:'/api/neopass/authenticator/registration/options',
  regV:'/api/neopass/authenticator/registration/verify',
  auth:'/api/neopass/authenticator/authentication/options',
  authV:'/api/neopass/authenticator/authentication/verify'};
const now=()=>1000000;
function credential(kind, challenge, overrides={}) {
  return {id:cred,rawId:cred,type:'public-key',response:{
    clientDataJSON:Buffer.from(JSON.stringify({
      type:kind,origin,challenge,crossOrigin:false,...overrides
    })).toString('base64url')
  }};
}
function fixture({authorized=true,csrf=true,rate=true,active=true,
                  approve=true,credentialId=cred,throwBackend=false}={}) {
  const pending=new Map(), calls=[];
  const base={enabled:true,origin,rpId,now,
    authenticateRequest:async()=>authorized?{subject,sessionKey,session:{token:'test-internal-session'}}:null,
    verifyCsrf:async()=>csrf,
    takeRateLimit:async()=>rate,
    lookupCredentialId:async()=>credentialId,
    authorizeEnrollment:async()=>approve?{allowed:true,bootstrapEvidence:{trustedTestApproval:true}}:null,
    ceremonies:{
      async put(value){
        const key=value.sessionKey+':'+value.kind;
        if(pending.has(key))throw Error('pending_ceremony_exists');
        pending.set(key,value);
      },
      async take({sessionKey,kind}){
        const key=sessionKey+':'+kind;const value=pending.get(key);pending.delete(key);return value;
      }
    },
    staging:{
      async beginRegistration(input){calls.push(['registration-start',input]);if(throwBackend)throw Error('sensitive');return {publicKey:{challenge:regChallenge,user:{id:'AQ'}},expiresAt:now()+60000};},
      async finishRegistration(input){calls.push(['registration-verify',input]);return {registered:true,credentialId:input.response.id,permissionGranted:false};},
      async beginAuthentication(input){calls.push(['authentication-start',input]);return active?{publicKey:{challenge:authChallenge,allowCredentials:[{id:cred}]},expiresAt:now()+60000}:null;},
      async verifyAuthentication(input){calls.push(['authentication-verify',input]);return {assurance:'webauthn-verified',subject,credentialId:input.response.id,origin,rpId,action:'authenticate',purpose:'authenticate',verifiedAt:now()};}
    }
  };
  const handler=createIsolatedStagingHttpAdapter(base);
  async function post(path,body={},opts={}){
    const headers={'Content-Type':'application/json','Origin':origin,'X-CSRF-Token':'test-token',...opts.headers};
    const request=new Request((opts.urlOrigin||origin)+path,{method:opts.method||'POST',headers,body:opts.method==='GET'?undefined:typeof body==='string'?body:JSON.stringify(body)});
    const response=await handler(request);
    return {status:response.status,body:await response.json(),headers:response.headers};
  }
  return {post,base,handler,pending,calls};
}
test('disabled by default without middleware or service',async()=>{
  const handle=createIsolatedStagingHttpAdapter();
  const res=await handle(new Request(origin+paths.auth));
  assert.equal(res.status,503);
});
test('fail closed if required trusted callbacks are absent',()=>{
  assert.throws(()=>createIsolatedStagingHttpAdapter({enabled:true,origin,rpId}),/dependencies_required/);
});
test('registration: approved server evidence, challenge binding, no granted access',async()=>{
  const f=fixture();const issued=await f.post(paths.reg);
  assert.equal(issued.status,200);assert.equal(issued.body.publicKey.challenge,regChallenge);
  assert.deepEqual(f.calls[0][1].bootstrapEvidence,{trustedTestApproval:true});
  const accepted=await f.post(paths.regV,{credential:credential('webauthn.create',regChallenge)});
  assert.deepEqual(accepted.body,{registered:true,credentialId:cred,permissionGranted:false});
  assert.equal(accepted.status,200);
  assert.equal(f.calls[1][1].challenge,regChallenge);
});
test('authentication: only trusted server selects credential and verifies scope',async()=>{
  const f=fixture();assert.equal((await f.post(paths.auth)).status,200);
  assert.equal(f.calls[0][1].credentialId,cred);
  const accepted=await f.post(paths.authV,{credential:credential('webauthn.get',authChallenge)});
  assert.equal(accepted.status,200);assert.deepEqual(accepted.body,{verified:true,credentialId:cred,permissionGranted:false});
});
test('rejects replay after successful authentication',async()=>{
  const f=fixture();await f.post(paths.auth);
  const body={credential:credential('webauthn.get',authChallenge)};
  assert.equal((await f.post(paths.authV,body)).status,200);
  assert.equal((await f.post(paths.authV,body)).status,403);
});
test('wrong challenge consumes ceremony; cannot replay correct challenge',async()=>{
  const f=fixture();await f.post(paths.auth);
  assert.equal((await f.post(paths.authV,{credential:credential('webauthn.get',regChallenge)})).status,403);
  assert.equal((await f.post(paths.authV,{credential:credential('webauthn.get',authChallenge)})).status,403);
  assert.equal(f.calls.some(([k])=>k==='authentication-verify'),false);
});
test('denies missing trusted enrollment approval',async()=>{
  const f=fixture({approve:false});assert.equal((await f.post(paths.reg)).status,403);assert.equal(f.calls.length,0);
});
test('denies no registered credential',async()=>{
  const f=fixture({credentialId:null});assert.equal((await f.post(paths.auth)).status,403);assert.equal(f.calls.length,0);
});
test('denies unverified request session',async()=>{
  const f=fixture({authorized:false});assert.equal((await f.post(paths.auth)).status,401);assert.equal(f.calls.length,0);
});
test('denies invalid CSRF',async()=>{
  const f=fixture({csrf:false});assert.equal((await f.post(paths.auth)).status,403);assert.equal(f.calls.length,0);
});
test('denies absent CSRF token',async()=>{
  const f=fixture();assert.equal((await f.post(paths.auth,{}, {headers:{'X-CSRF-Token':''}})).status,403);
});
test('rate limits before calling staging',async()=>{
  const f=fixture({rate:false});assert.equal((await f.post(paths.auth)).status,429);assert.equal(f.calls.length,0);
});
test('denies cross-origin and mismatched host',async()=>{
  const f=fixture();assert.equal((await f.post(paths.auth,{}, {headers:{Origin:'https://evil.example.test'}})).status,403);
  assert.equal((await f.post(paths.auth,{}, {urlOrigin:'https://evil.example.test'})).status,404);
  assert.equal(f.calls.length,0);
});
test('denies cross-site fetch header',async()=>{
  const f=fixture();assert.equal((await f.post(paths.auth,{}, {headers:{'Sec-Fetch-Site':'cross-site'}})).status,403);
});
test('denies nonempty option request body (no caller-supplied subject or flags)',async()=>{
  const f=fixture();assert.equal((await f.post(paths.reg,{subject:'pretend-admin',verified:true})).status,400);assert.equal(f.calls.length,0);
});
test('denies extra verification properties',async()=>{
  const f=fixture();await f.post(paths.reg);
  assert.equal((await f.post(paths.regV,{credential:credential('webauthn.create',regChallenge),approved:true})).status,400);
});
test('denies wrong browser origin in clientData',async()=>{
  const f=fixture();await f.post(paths.auth);
  assert.equal((await f.post(paths.authV,{credential:credential('webauthn.get',authChallenge,{origin:'https://evil.example.test'})})).status,403);
  assert.equal(f.calls.some(([k])=>k==='authentication-verify'),false);
});
test('denies an assertion as registration',async()=>{
  const f=fixture();await f.post(paths.reg);
  assert.equal((await f.post(paths.regV,{credential:credential('webauthn.get',regChallenge)})).status,403);
});
test('denies crossOrigin=true in browser payload',async()=>{
  const f=fixture();await f.post(paths.auth);
  assert.equal((await f.post(paths.authV,{credential:credential('webauthn.get',authChallenge,{crossOrigin:true})})).status,403);
});
test('denies malformed JSON',async()=>{
  const f=fixture();assert.equal((await f.post(paths.auth,'{')).status,400);
});
test('denies unsupported content type',async()=>{
  const f=fixture();assert.equal((await f.post(paths.auth,{}, {headers:{'Content-Type':'text/plain'}})).status,415);
});
test('denies oversized declared payload',async()=>{
  const f=fixture();assert.equal((await f.post(paths.auth,{}, {headers:{'Content-Length':'999999'}})).status,413);
});
test('refuses GET and unknown routes',async()=>{
  const f=fixture();assert.equal((await f.post(paths.auth,{}, {method:'GET'})).status,405);
  assert.equal((await f.post('/random')).status,404);
});
test('errors from backend sanitized and no-store',async()=>{
  const f=fixture({throwBackend:true});const result=await f.post(paths.reg);
  assert.equal(result.status,503);assert.deepEqual(result.body,{error:'staging_unavailable'});
  assert.equal(result.headers.get('cache-control'),'no-store');
});
test('rejects backend proof with wrong subject',async()=>{
  const f=fixture();f.base.staging.verifyAuthentication=async()=>({assurance:'webauthn-verified',subject:'attacker',credentialId:cred,origin,rpId,action:'authenticate',purpose:'authenticate',verifiedAt:now()});
  await f.post(paths.auth);assert.equal((await f.post(paths.authV,{credential:credential('webauthn.get',authChallenge)})).status,403);
});
test('rejects backend proof with wrong action',async()=>{
  const f=fixture();f.base.staging.verifyAuthentication=async()=>({assurance:'webauthn-verified',subject,credentialId:cred,origin,rpId,action:'recover',purpose:'authenticate',verifiedAt:now()});
  await f.post(paths.auth);assert.equal((await f.post(paths.authV,{credential:credential('webauthn.get',authChallenge)})).status,403);
});
test('rejects stale proof',async()=>{
  const f=fixture();f.base.staging.verifyAuthentication=async()=>({assurance:'webauthn-verified',subject,credentialId:cred,origin,rpId,action:'authenticate',purpose:'authenticate',verifiedAt:now()-65000});
  await f.post(paths.auth);assert.equal((await f.post(paths.authV,{credential:credential('webauthn.get',authChallenge)})).status,403);
});
test('rejects a stale ceremony',async()=>{
  const f=fixture();await f.post(paths.auth);const key=sessionKey+':authentication';f.pending.get(key).expiresAt=now()-1;
  assert.equal((await f.post(paths.authV,{credential:credential('webauthn.get',authChallenge)})).status,403);
});
