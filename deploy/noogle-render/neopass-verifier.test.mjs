import assert from 'node:assert/strict';
import test from 'node:test';
import { generateKeyPairSync, sign } from 'node:crypto';
import { createNeoPassVerifier } from './neopass-verifier.mjs';
const {privateKey,publicKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
const jwk={...publicKey.export({format:'jwk'}),alg:'ES256'};
const clock=2_000_000_000;
const base={iss:'https://auth.example.test',aud:'noogle-connect',sub:'user-1',iat:clock-1,nbf:clock-1,exp:clock+120,jti:'session-1'};
function token(claims=base,header={alg:'ES256',typ:'JWT',kid:'approved'}){
 const input=[header,claims].map(p=>Buffer.from(JSON.stringify(p)).toString('base64url')).join('.');
 return input+'.'+sign('sha256',Buffer.from(input),{key:privateKey,dsaEncoding:'ieee-p1363'}).toString('base64url');
}
const config={issuer:base.iss,audience:base.aud,keys:{approved:jwk},now:()=>clock*1000,isRevoked:async()=>false};
test('valid signed JWT is session-only, never treated as device-bound',async()=>{
 const result=await createNeoPassVerifier(config)(token());
 assert.deepEqual(result,{subject:'user-1',sessionId:'session-1',assurance:'session-only'});
});
test('tampering, expired and wrong-issuer tokens fail closed',async()=>{
 const verify=createNeoPassVerifier(config);
 assert.equal(await verify(token({...base,iss:'https://attacker.example'})),null);
 assert.equal(await verify(token({...base,exp:clock})),null);
 assert.equal(await verify(token({...base,aud:'other'})),null);
 assert.equal(await verify(token({...base,sub:'attacker'}).replace(/.$/,'z')),null);
 assert.equal(await verify(token(base,{alg:'none',typ:'JWT',kid:'approved'})),null);
 assert.equal(await verify('not-a-token'),null);
});
test('revocation callback prevents accepted sessions',async()=>{
 const verify=createNeoPassVerifier({...config,isRevoked:async()=>true});
 assert.equal(await verify(token()),null);
});
