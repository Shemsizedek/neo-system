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

test('accepts stored PEM keys using the same signature verification',async()=>{
 const verify=createAssertionVerifier({rpId,origin,consumeChallenge:async()=>true,getCredential:async()=>({subject:'person-1',rpId,publicKey:publicKey.export({type:'spki',format:'pem'}),confirmCounter:async n=>n===1})});
 assert.equal((await verify(signedAssertion())).subject,'person-1');
});
test('tampered signature never consumes a challenge with a public KeyObject',async()=>{
 let consumed=false;
 const verify=createAssertionVerifier({rpId,origin,consumeChallenge:async()=>{consumed=true;return true;},getCredential:async()=>({subject:'person-1',rpId,publicKey,confirmCounter:async()=>true})});
 const assertion=signedAssertion(),signature=Buffer.from(assertion.signature,'base64url');signature[signature.length-1]^=1;
 assert.equal(await verify({...assertion,signature:signature.toString('base64url')}),null);
 assert.equal(consumed,false);
});
test('revoked credentials and failed counter checks never grant identity',async()=>{
 for(const revoked of [true,false]){
  const verify=createAssertionVerifier({rpId,origin,consumeChallenge:async()=>true,getCredential:async()=>({subject:'person-1',rpId,publicKey,revoked,confirmCounter:async()=>false})});
  assert.equal(await verify(signedAssertion()),null);
 }
});
