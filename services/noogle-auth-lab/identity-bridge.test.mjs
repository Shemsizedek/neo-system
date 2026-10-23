import test from 'node:test';
import assert from 'node:assert/strict';
import { issueNeopassToken } from '../../server/neo-platform-api/neopass-google-auth.mjs';
import { verifyNoogleIdentity, authorizeNoogleEnrollment, authorizeNoogleTerminal } from './identity-bridge.mjs';

const secret='integration-test-secret-value';
const now=()=>Date.UTC(2026,9,14,12,0,0);
function token(claims={}, ttlSeconds=300) { return issueNeopassToken({subject:'user:test',secret,now,ttlSeconds,claims}); }

test('accepts valid generic verified NEO Pass identity',()=>{
  assert.deepEqual(verifyNoogleIdentity(token(),{secret,now}),{subject:'user:test'});
});
test('rejects missing, altered and expired credentials',()=>{
  assert.equal(verifyNoogleIdentity('',{secret,now}),null);
  assert.equal(verifyNoogleIdentity(token()+'changed',{secret,now}),null);
  assert.equal(verifyNoogleIdentity(token({},-1),{secret,now}),null);
});
test('rejects tokens for privileged other-system scopes',()=>{
  assert.equal(verifyNoogleIdentity(token({scope:'crown:root-enroll',token_use:'crown-office-attestation'}),{secret,now}),null);
  assert.equal(verifyNoogleIdentity(token({scope:'neo:oracle:execute',token_use:'browser'}),{secret,now}),null);
  assert.equal(verifyNoogleIdentity(token({role:'service'}),{secret,now}),null);
});
test('enrollment requires fresh identity and CSRF proof',()=>{
  const identity=verifyNoogleIdentity(token(),{secret,now});
  assert.throws(()=>authorizeNoogleEnrollment({identity}),/fresh_neopass_identity/);
  assert.throws(()=>authorizeNoogleEnrollment({identity,csrfValidated:true}),/fresh_neopass_identity/);
  assert.deepEqual(authorizeNoogleEnrollment({identity,csrfValidated:true,freshLogin:true}),{subject:'user:test'});
});
test('terminal remains unconditionally unavailable',()=>{
  assert.throws(()=>authorizeNoogleTerminal(),/disabled/);
});
