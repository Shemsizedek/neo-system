import test from 'node:test';
import assert from 'node:assert/strict';
import {makeAuthenticatorClient,serializeCredential} from './webauthn-client.mjs';
test('missing CSRF token rejects before network request',async()=>{
  let calls=0;
  const client=makeAuthenticatorClient({origin:'https://connect.example.test',credentials:{get:async()=>null},fetcher:async()=>{calls++;return {ok:false}}});
  await assert.rejects(client.authenticate(),/csrf_token_required/);
  assert.equal(calls,0);
});
test('API requests carry CSRF and same-origin credentials',async()=>{
  let options;
  const client=makeAuthenticatorClient({origin:'https://connect.example.test',csrfToken:'test-csrf-token',credentials:{get:async()=>null},fetcher:async(_path,config)=>{options=config;return {ok:false,status:401}}});
  await assert.rejects(client.authenticate(),/neopass_api_error_401/);
  assert.equal(options.headers['X-CSRF-Token'],'test-csrf-token');
  assert.equal(options.credentials,'same-origin');
});
test('registration transport includes available browser transport metadata',()=>{
  const credential={id:'abc',rawId:new Uint8Array([1,2,3]),type:'public-key',authenticatorAttachment:'cross-platform',response:{clientDataJSON:new Uint8Array([4,5]),attestationObject:new Uint8Array([6]),getTransports:()=>['usb']}};
  const serialized=serializeCredential(credential);
  assert.deepEqual(serialized.response.transports,['usb']);
  assert.equal(serialized.authenticatorAttachment,'cross-platform');
});
