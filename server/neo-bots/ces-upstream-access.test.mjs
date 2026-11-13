import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createCesSessionAdapter} from './ces-session-adapter.mjs';
import {createCesReadServer} from './ces-read-server.mjs';
import {runCesAdminLoginPreflight} from './ces-admin-login-preflight.mjs';

const credentials=async()=>({
  username:'NMNI0000',password:'test-fixture-do-not-log',
  loginPath:'/login.asp',submitPath:'/rlogin.asp',
  usernameField:'uid',passwordField:'passwd',
  authenticatedPath:'/memac.asp',
  authenticatedText:'Noocratic Open Market Nibiru Index'
});
const exchange={exchangeId:'NMNI',adminAccount:'NMNI0000',bankAccount:'NMNIBANK'};

for(const status of [401,403,429]){
  test('upstream HTTP '+status+' blocks login before any credential POST',async()=>{
    const calls=[];
    const adapter=createCesSessionAdapter({
      credentialProvider:credentials,
      fetchImpl:async(url,options={})=>{
        calls.push({path:new URL(url).pathname,method:options.method||'GET'});
        return new Response('access denied',{status});
      }
    });
    await assert.rejects(adapter.login(exchange),e=>e.validationReason==='upstream_access_denied');
    assert.deepEqual(calls,[{path:'/login.asp',method:'GET'}]);
  });
}

test('redirected login page is not trusted or submitted',async()=>{
  const calls=[];
  const adapter=createCesSessionAdapter({
    credentialProvider:credentials,
    fetchImpl:async(url,options={})=>{
      calls.push(options.method||'GET');
      return new Response(null,{status:302,headers:{location:'https://other.example/login'}});
    }
  });
  await assert.rejects(adapter.login(exchange),e=>e.validationReason==='login_page_unavailable');
  assert.deepEqual(calls,['GET']);
});

test('CES runtime reports precise redacted 403 stage without leaking credentials',async()=>{
  const attempts=[];
  const secret='runtime-secret-fixture-never-return';
  const env={
    NEO_CES_RUNTIME_TOKEN:'test-runtime-control-token-'.repeat(2),
    NEO_CES_NMNI_USERNAME:'NMNI0000',
    NEO_CES_NMNI_PASSWORD:secret
  };
  const server=createCesReadServer({
    env,store:{ping:async()=>true},
    fetchImpl:async(url,options={})=>{
      attempts.push({path:new URL(url).pathname,method:options.method||'GET'});
      return new Response('blocked',{status:403});
    }
  });
  server.listen(0,'127.0.0.1');await once(server,'listening');
  try{
    const res=await fetch('http://127.0.0.1:'+server.address().port+'/v1/auth/check',{
      method:'POST',headers:{authorization:'Bearer '+env.NEO_CES_RUNTIME_TOKEN}
    });
    assert.equal(res.status,502);
    const result=await res.json();
    assert.deepEqual(result.diagnostic,{
      stage:'login_page',reason:'upstream_access_denied',httpStatus:403
    });
    assert.deepEqual(attempts,[{path:'/login.asp',method:'GET'}]);
    assert.doesNotMatch(JSON.stringify(result),new RegExp(secret));
  }finally{server.closeAllConnections();await new Promise(done=>server.close(done))}
});

test('one-shot preflight keeps exact diagnostic without propagating response text',async()=>{
  const outputs=[];
  const result=await runCesAdminLoginPreflight({
    port:10000,token:'test-runtime-control-token-'.repeat(2),
    logger:x=>outputs.push(x),
    fetchImpl:async()=>new Response(JSON.stringify({
      diagnostic:{stage:'login_page',reason:'upstream_access_denied',httpStatus:403,
        rawHtml:'never-print-this'}
    }),{status:502})
  });
  assert.equal(result.reason,'upstream_access_denied');
  assert.equal(result.stage,'login_page');
  assert.doesNotMatch(JSON.stringify(outputs),/never-print-this/);
});
