import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectNeopassReadiness } from './neopass-readiness.mjs';
test('missing NEO Pass configuration fails closed without values',()=>{
 const status=inspectNeopassReadiness({});
 assert.equal(status.ready,false);assert.equal(status.checks.signingSecret,false);
 assert.equal(JSON.stringify(status).includes('supersecret'),false);
});
test('complete configuration reports presence but never echoes credentials',()=>{
 const secret='s'.repeat(64),client='client-secret-value';
 const status=inspectNeopassReadiness({NEO_PASS_DB_PATH:'/var/data/neopass/identity.sqlite',NEO_PASS_STORAGE_DURABLE:'true',NEO_PASS_ORIGIN:'https://egov.holytemples.org',NEO_PASS_JWT_SECRET:secret,});
 assert.equal(status.ready,true);assert.equal(JSON.stringify(status).includes(secret),false);
 assert.equal(JSON.stringify(status).includes(client),false);
});
test('short signing key fails readiness',()=>{
 const s=inspectNeopassReadiness({NEO_PASS_DB_PATH:'/var/data/neopass/identity.sqlite',NEO_PASS_STORAGE_DURABLE:'true',NEO_PASS_ORIGIN:'https://egov.holytemples.org',NEO_PASS_JWT_SECRET:'short',});
 assert.equal(s.ready,false);
});
