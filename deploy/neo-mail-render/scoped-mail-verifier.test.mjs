import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createScopedMailVerifier} from './scoped-mail-verifier.mjs';
test('revocation backend is mandatory',()=>{
 assert.throws(()=>createScopedMailVerifier({issuer:'https://issuer.example',audience:'neo-mail',jwksUrl:'https://issuer.example/jwks'}),/revocation_check_required/);
});
test('unauthenticated identity is always refused',async()=>{
 const verify=createScopedMailVerifier({issuer:'https://issuer.example',audience:'neo-mail',jwksUrl:'https://issuer.example/jwks',isRevoked:async()=>false});
 assert.equal(await verify({verified:true,subject:'spoof',mailbox:'chaplain@holytemples.org'}),null);
 assert.equal(await verify('not-a-token'),null);
});
