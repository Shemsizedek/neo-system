import test from 'node:test';
import assert from 'node:assert/strict';
import {createNeoMaskAssertionVerifier} from './neomask-webauthn-adapter.mjs';
const digest='a'.repeat(64),subject='google:member',approvalId='approval-123';
const input={subject,digest,operation:'ces.transfer',approvalId,assertion:{id:'cred-1'}};
const base={
 getChallenge:async()=>({subject,digest,operation:'ces.transfer',approvalId,challenge:'server-issued',expiresAtMs:200}),
 getCredential:async()=>({id:'cred-1',subject,rpId:'connect.holytemples.org',publicKey:'test-key',counter:0}),
 verifyAuthenticationResponse:async()=>({verified:true,authenticationInfo:{userVerified:true}}),now:()=>100
};
test('rejects untrusted RP origin',()=>assert.throws(()=>createNeoMaskAssertionVerifier({...base,expectedOrigin:'https://neomask.holytemples.org'}),/untrusted_relying_party/));
test('rejects missing cryptographic library',()=>assert.throws(()=>createNeoMaskAssertionVerifier({}),/webauthn_dependencies_required/));
test('accepts only fully verified assertion from trusted verifier',async()=>{
 const verify=createNeoMaskAssertionVerifier(base);
 assert.equal(await verify(input),true);
 const denied=createNeoMaskAssertionVerifier({...base,verifyAuthenticationResponse:async()=>({verified:true,authenticationInfo:{userVerified:false}})});
 assert.equal(await denied(input),false);
});
test('rejects expired challenge',async()=>{
 const verify=createNeoMaskAssertionVerifier({...base,now:()=>201});
 assert.equal(await verify(input),false);
});
test('rejects wrong credential subject',async()=>{
 const verify=createNeoMaskAssertionVerifier({...base,getCredential:async()=>({...await base.getCredential(),subject:'attacker'})});
 assert.equal(await verify(input),false);
});
test('rejects mismatched challenge digest',async()=>{
 const verify=createNeoMaskAssertionVerifier({...base,getChallenge:async()=>({...await base.getChallenge(),digest:'b'.repeat(64)})});
 assert.equal(await verify(input),false);
});
