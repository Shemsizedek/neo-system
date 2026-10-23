import test from 'node:test';
import assert from 'node:assert/strict';
import {assertWirePasskeyReadiness} from './wire-passkey-feature-gate.mjs';
const deps={
 verifier:{verifyRegistration(){},verifyAuthentication(){}},
 challengeStore:{issue(){},consumeVerified(){}},
 credentialRegistry:{register(){},getForVerification(){},updateCounter(){}},
 sessionResolver(){},rateLimiter(){},audit(){}
};
test('feature defaults disabled',()=>assert.deepEqual(assertWirePasskeyReadiness(),{enabled:false,reason:'feature_disabled'}));
test('production rejects activation without certification',()=>assert.throws(()=>assertWirePasskeyReadiness({enabled:true,...deps}),/production_not_certified/));
test('staging refuses missing security dependencies',()=>assert.throws(()=>assertWirePasskeyReadiness({enabled:true,environment:'staging',...deps,rateLimiter:null}),/dependency_missing:rateLimiter/));
test('staging requires callable security hooks',()=>assert.throws(()=>assertWirePasskeyReadiness({enabled:true,environment:'staging',...deps,audit:{}}),/security_hook_invalid/));
test('staging accepts fully provided dependencies',()=>assert.deepEqual(assertWirePasskeyReadiness({enabled:true,environment:'staging',...deps}),{enabled:true,environment:'staging'}));
