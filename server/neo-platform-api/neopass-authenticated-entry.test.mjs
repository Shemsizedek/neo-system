import assert from 'node:assert/strict';
import test from 'node:test';
import {launchAuthenticatedNeopass} from './neopass-authenticated-entry.mjs';
const ready={NEO_PASS_DB_PATH:'/var/data/neopass/identity.sqlite',NEO_PASS_STORAGE_DURABLE:'true',NEO_PASS_ORIGIN:'https://egov.holytemples.org',NEO_PASS_JWT_SECRET:'x'.repeat(40)};
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
