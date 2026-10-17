import test from 'node:test';
import assert from 'node:assert/strict';
import {createWirePasskeyVerifier} from './wire-passkey-verifier.mjs';

const config={rpId:'wire.holytemples.org',origin:'https://wire.holytemples.org'};
test('missing verifier or insecure origin is rejected',()=>{
 assert.throws(()=>createWirePasskeyVerifier(config),/webauthn_verifier_required/);
 assert.throws(()=>createWirePasskeyVerifier({...config,origin:'http://wire.holytemples.org',verifyRegistrationResponse:async()=>({}),verifyAuthenticationResponse:async()=>({})}),/valid_rp_and_origin_required/);
});
test('registration requires verified result and registrationInfo',async()=>{
 const verifier=createWirePasskeyVerifier({...config,verifyRegistrationResponse:async()=>({verified:false}),verifyAuthenticationResponse:async()=>({})});
 await assert.rejects(()=>verifier.verifyRegistration({response:{},expectedChallenge:'abc'}),/registration_verification_failed/);
});
test('authentication requires verified result and authenticationInfo',async()=>{
 const verifier=createWirePasskeyVerifier({...config,verifyRegistrationResponse:async()=>({}),verifyAuthenticationResponse:async()=>({verified:false})});
 await assert.rejects(()=>verifier.verifyAuthentication({response:{},expectedChallenge:'abc',authenticator:{}}),/authentication_verification_failed/);
});
test('expected origin, RP ID and challenge are passed to verifier',async()=>{
 let observed;
 const verifier=createWirePasskeyVerifier({...config,verifyRegistrationResponse:async input=>{observed=input;return {verified:true,registrationInfo:{credential:{id:'x'}}}},verifyAuthenticationResponse:async()=>({})});
 await verifier.verifyRegistration({response:{id:'x'},expectedChallenge:'challenge-1'});
 assert.equal(observed.expectedOrigin,config.origin);
 assert.equal(observed.expectedRPID,config.rpId);
 assert.equal(observed.expectedChallenge,'challenge-1');
 assert.equal(observed.requireUserVerification,true);
});
