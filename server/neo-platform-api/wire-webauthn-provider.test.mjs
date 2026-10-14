import test from 'node:test';
import assert from 'node:assert/strict';
import {createSimpleWebAuthnWireVerifier} from './wire-webauthn-provider.mjs';

test('uninstalled WebAuthn provider fails closed',async()=>{
 await assert.rejects(()=>createSimpleWebAuthnWireVerifier({load:async()=>{throw Error('not installed')}}),/webauthn_provider_unavailable/);
});
test('invalid provider fails closed',async()=>{
 await assert.rejects(()=>createSimpleWebAuthnWireVerifier({load:async()=>({})}),/webauthn_provider_invalid/);
});
test('registration binds RP, HTTPS origin and verification requirement',async()=>{
 let args;
 const verifier=await createSimpleWebAuthnWireVerifier({load:async()=>({
  verifyRegistrationResponse:async input=>{args=input;return {verified:true,registrationInfo:{credential:{id:'cred',publicKey:new Uint8Array([1])}}}},
  verifyAuthenticationResponse:async()=>({verified:true,authenticationInfo:{newCounter:1}})
 })});
 await verifier.verifyRegistration({response:{id:'cred'},expectedChallenge:'challenge'});
 assert.equal(args.expectedRPID,'wire.holytemples.org');
 assert.equal(args.expectedOrigin,'https://wire.holytemples.org');
 assert.equal(args.requireUserVerification,true);
});
