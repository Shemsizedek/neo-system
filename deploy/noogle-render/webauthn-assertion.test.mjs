import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash,generateKeyPairSync,sign } from 'node:crypto';
import {createAssertionVerifier} from './webauthn-assertion.mjs';
const hash=b=>createHash('sha256').update(b).digest();
const {privateKey,publicKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
const rpId='connect.example.test',origin='https://connect.example.test',credentialId='cred-1';
function signedAssertion({challenge='test-nonce',clientOrigin=origin,flags=5,counter=1}={}){
 const clientRaw=Buffer.from(JSON.stringify({type:'webauthn.get',origin:clientOrigin,challenge}));
 const authData=Buffer.alloc(37);hash(Buffer.from(rpId)).copy(authData,0);authData[32]=flags;authData.writeUInt32BE(counter,33);
 return {credentialId,clientDataJSON:clientRaw.toString('base64url'),authenticatorData:authData.toString('base64url'),signature:sign('sha256',Buffer.concat([authData,hash(clientRaw)]),privateKey).toString('base64url')};
}
test('valid device-bound signed assertion with fresh challenge succeeds',async()=>{
 let consumed=0;
 const verify=createAssertionVerifier({rpId,origin,consumeChallenge:async()=>{consumed++;return consumed===1;},getCredential:async()=>({subject:'person-1',rpId,publicKey,confirmCounter:async n=>n===1})});
 const a=signedAssertion();assert.deepEqual(await verify(a),{subject:'person-1',credentialId,assurance:'device-bound'});
 assert.equal(await verify(a),null);
});
test('rejects wrong origin, user verification absent and invalid signature',async()=>{
 const verify=createAssertionVerifier({rpId,origin,consumeChallenge:async()=>true,getCredential:async()=>({subject:'p',rpId,publicKey,confirmCounter:async()=>true})});
 assert.equal(await verify(signedAssertion({clientOrigin:'https://evil.example.test'})),null);
 assert.equal(await verify(signedAssertion({flags:1})),null);
 assert.equal(await verify({...signedAssertion(),signature:Buffer.from('wrong').toString('base64url')}),null);
});

test('accepts serialized SPKI public keys as well as public KeyObjects',async()=>{
 const pem=publicKey.export({type:'spki',format:'pem'});
 const verify=createAssertionVerifier({rpId,origin,consumeChallenge:async()=>true,getCredential:async()=>({subject:'p',rpId,publicKey:pem,confirmCounter:async()=>true})});
 assert.equal((await verify(signedAssertion())).subject,'p');
});

test('rejects revoked credentials, missing counter policy and counter rejection',async()=>{
 for(const extra of [{revoked:true},{confirmCounter:null},{confirmCounter:async()=>false}]) {
  const verify=createAssertionVerifier({rpId,origin,consumeChallenge:async()=>true,getCredential:async()=>({subject:'p',rpId,publicKey,confirmCounter:async()=>true,...extra})});
  assert.equal(await verify(signedAssertion()),null);
 }
});

test('rejects wrong RP hash and backup-eligible credentials before consuming challenge',async()=>{
 let consumed=0;
 const verify=createAssertionVerifier({rpId,origin,consumeChallenge:async()=>{consumed++;return true;},getCredential:async()=>({subject:'p',rpId,publicKey,confirmCounter:async()=>true})});
 const assertion=signedAssertion();
 const data=Buffer.from(assertion.authenticatorData,'base64url');data[0]^=1;
 assert.equal(await verify({...assertion,authenticatorData:data.toString('base64url')}),null);
 for(const flags of [13,21,29])assert.equal(await verify(signedAssertion({flags})),null);
 assert.equal(consumed,0);
});

test('rejects private KeyObjects and malformed keys without issuing identity',async()=>{
 for(const key of [privateKey,'invalid-public-key']) {
  const verify=createAssertionVerifier({rpId,origin,consumeChallenge:async()=>true,getCredential:async()=>({subject:'p',rpId,publicKey:key,confirmCounter:async()=>true})});
  assert.equal(await verify(signedAssertion()),null);
 }
});
