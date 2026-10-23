import test from 'node:test';
import assert from 'node:assert/strict';
import {createWebAuthnCryptoVerifier} from './webauthn-crypto.mjs';
const credential={id:'cred-1',publicKey:Buffer.alloc(65,7).toString('base64url'),counter:5};
const args={assertion:{id:'cred-1'},challenge:{challenge:'server-generated'},credential};
test('fails closed without actual verification library',()=>assert.throws(()=>createWebAuthnCryptoVerifier(),/webauthn_crypto_library_required/));
test('rejects incorrect RP',()=>assert.throws(()=>createWebAuthnCryptoVerifier({origin:'https://evil.test',library:{verifyAuthenticationResponse:async()=>({})}}),/invalid_webauthn_rp/));
test('accepts only trusted verification result with increasing counter',async()=>{
 let options;
 const verify=createWebAuthnCryptoVerifier({library:{verifyAuthenticationResponse:async x=>{options=x;return {verified:true,authenticationInfo:{userVerified:true,newCounter:6}}}}});
 assert.deepEqual(await verify(args),{verified:true,credentialId:'cred-1',expectedCounter:5,newCounter:6});
 assert.equal(options.expectedRPID,'connect.holytemples.org');
 assert.equal(options.expectedChallenge,'server-generated');
 assert.equal(options.requireUserVerification,true);
});
test('rejects verified results without user verification or counter increment',async()=>{
 for(const info of [{userVerified:false,newCounter:6},{userVerified:true,newCounter:5}]){
  const verify=createWebAuthnCryptoVerifier({library:{verifyAuthenticationResponse:async()=>({verified:true,authenticationInfo:info})}});
  assert.deepEqual(await verify(args),{verified:false});
 }
});
test('invalid signatures fail closed',async()=>{
 const verify=createWebAuthnCryptoVerifier({library:{verifyAuthenticationResponse:async()=>{throw Error('invalid signature')}}});
 assert.deepEqual(await verify(args),{verified:false});
});
