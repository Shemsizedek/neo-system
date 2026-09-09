import test from 'node:test';
import assert from 'node:assert/strict';
import {createCesRuntimeBridge} from './runtime-bridge.mjs';

function jsonResponse(body,status=200){return {ok:status>=200&&status<300,status,headers:{get:()=> 'application/json'},json:async()=>body};}

test('session mode uses runtime cookie without exposing it in status',async()=>{
  const secret='short-lived-secret';
  let seenCookie=null;
  const bridge=createCesRuntimeBridge({
    mode:'session-readonly',readUrl:'https://example.test/ces-read',network:'NMNI',account:'NMNI0000',sessionCookie:secret,
    fetchImpl:async(_url,opts)=>{seenCookie=opts.headers.cookie;return jsonResponse({account:'NMNI0000',balances:[{unit:'CES',amount:7}],transactions:[]});}
  });
  const result=await bridge.read();
  assert.equal(result.transport,'authorized-session');
  assert.equal(seenCookie,secret);
  assert.equal(JSON.stringify(bridge.status()).includes(secret),false);
  assert.equal(result.snapshot.readOnly,true);
});

test('session mode fails closed without runtime session material',async()=>{
  const bridge=createCesRuntimeBridge({mode:'session-readonly',readUrl:'https://example.test/ces-read',account:'NMNI0000'});
  await assert.rejects(()=>bridge.read(),/runtime CES_SESSION_COOKIE/);
});

test('status mode requires no credentials and remains read-only',async()=>{
  const bridge=createCesRuntimeBridge({mode:'status'});
  const result=await bridge.read();
  assert.equal(result.state,'READY_FOR_AUTHORIZED_CONNECTION');
  assert.equal(result.status.readOnly,true);
  assert.equal(result.status.cloudflareRequired,false);
  assert.equal(result.status.credentialPersistence,false);
});
