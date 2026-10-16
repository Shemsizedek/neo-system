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
 const status=inspectNeopassReadiness({GOOGLE_CLOUD_PROJECT:'example',NEO_PASS_JWT_SECRET:secret,GOOGLE_OAUTH_CLIENT_ID:client,NEO_EXECUTIVE_ADMIN_EMAIL:'admin@example.com'});
 assert.equal(status.ready,true);assert.equal(JSON.stringify(status).includes(secret),false);
 assert.equal(JSON.stringify(status).includes(client),false);
});
test('short signing key fails readiness',()=>{
 const s=inspectNeopassReadiness({GOOGLE_CLOUD_PROJECT:'example',NEO_PASS_JWT_SECRET:'short',GOOGLE_OAUTH_CLIENT_ID:'client',NEO_EXECUTIVE_ADMIN_EMAIL:'admin@example.com'});
 assert.equal(s.ready,false);
});
