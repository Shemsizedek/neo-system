import assert from 'node:assert/strict';
import test from 'node:test';
import {launchAuthenticatedNeopass} from './neopass-authenticated-entry.mjs';
const ready={GOOGLE_CLOUD_PROJECT:'example',NEO_PASS_JWT_SECRET:'x'.repeat(40),GOOGLE_OAUTH_CLIENT_ID:'test-client',NEO_EXECUTIVE_ADMIN_EMAIL:'admin@example.com'};
test('missing configuration never starts authentication runtime',async()=>{
 let called=false;
 await assert.rejects(()=>launchAuthenticatedNeopass({env:{},start:()=>{called=true;}}),/neopass_configuration_incomplete/);
 assert.equal(called,false);
});
test('complete configuration only permits the supplied authenticated start factory',async()=>{
 let called=0;
 const result=await launchAuthenticatedNeopass({env:ready,start:()=>{called++;return 'started';}});
 assert.equal(result,'started');assert.equal(called,1);
});
test('no missing authenticated start factory may fall through',async()=>{
 await assert.rejects(()=>launchAuthenticatedNeopass({env:ready}),/authenticated_server_factory_required/);
});
