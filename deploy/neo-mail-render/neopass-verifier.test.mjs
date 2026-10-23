import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createNeoPassVerifier} from './neopass-verifier.mjs';
test('requires issuer/audience/JWKS configuration',()=>{
 assert.throws(()=>createNeoPassVerifier({}),/not_configured/);
 assert.throws(()=>createNeoPassVerifier({issuer:'http://auth.example',audience:'neo-mail',jwksUrl:'http://auth.example/keys'}),/invalid_issuer/);
 assert.throws(()=>createNeoPassVerifier({issuer:'https://a.example',audience:'neo-mail',jwksUrl:'https://other.example/keys'}),/invalid_issuer/);
});
test('rejects unsupported algorithms and anonymous credentials',async()=>{
 assert.throws(()=>createNeoPassVerifier({issuer:'https://auth.example',audience:'neo-mail',jwksUrl:'https://auth.example/jwks',allowedAlgorithms:['none']}),/unsupported_algorithm/);
 const verify=createNeoPassVerifier({issuer:'https://auth.example',audience:'neo-mail',jwksUrl:'https://auth.example/jwks'});
 assert.equal(await verify(),null);
 assert.equal(await verify({verified:true,subject:'spoof',mailbox:'chaplain@holytemples.org'}),null);
 assert.equal(await verify({token:'not-a-jwt'}),null);
});
