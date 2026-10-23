import test from 'node:test';import assert from 'node:assert/strict';
import {identityResponseHeaders,ensureGuardianOrigin,stagingReadiness} from './staging-policy.mjs';
test('private credentials never cache',()=>{
 const h=identityResponseHeaders();
 assert.match(h['Cache-Control'],/no-store/);
 assert.equal(h.Vary,'Authorization');
 assert.equal(h['Referrer-Policy'],'no-referrer');
});
test('wrong host is rejected',()=>assert.equal(ensureGuardianOrigin({host:'evil.test'}),false));
test('cross-site writes rejected',()=>{
 assert.equal(ensureGuardianOrigin({host:'connect.holytemples.org',origin:'https://evil.test',method:'POST'}),false);
 assert.equal(ensureGuardianOrigin({host:'connect.holytemples.org',origin:'https://connect.holytemples.org',method:'POST'}),true);
});
test('no deployment without all independent checks',()=>{
 assert.equal(stagingReadiness({tlsVerified:true,neoPassIntegrated:true}).deployable,false);
 assert.equal(stagingReadiness({tlsVerified:true,neoPassIntegrated:true,authenticatorTested:true,credentialPersistenceVerified:true}).deployable,true);
});
test('enrollment and terminal remain unavailable',()=>{
 const s=stagingReadiness();
 assert.equal(s.enrollmentEnabled,false);
 assert.equal(s.terminalEnabled,false);
});
