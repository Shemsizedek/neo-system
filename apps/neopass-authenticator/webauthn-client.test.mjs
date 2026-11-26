import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeBase64url,encodeBase64url,parseCreationOptions,parseRequestOptions,makeAuthenticatorClient} from './webauthn-client.mjs';
test('base64url round trip',()=>assert.deepEqual(decodeBase64url(encodeBase64url(new Uint8Array([0,251,255]))),new Uint8Array([0,251,255])));
test('reject malformed encoded ids',()=>assert.throws(()=>decodeBase64url('not+url'),/invalid_base64url/));
test('creation parses challenge and identity',()=>{const o=parseCreationOptions({publicKey:{challenge:'AQ',user:{id:'Ag'},excludeCredentials:[{id:'Aw',type:'public-key'}]}});assert.deepEqual([...o.publicKey.challenge],[1]);assert.deepEqual([...o.publicKey.user.id],[2]);assert.deepEqual([...o.publicKey.excludeCredentials[0].id],[3]);});
test('authentication parses requested credential',()=>assert.deepEqual([...parseRequestOptions({publicKey:{challenge:'AQ',allowCredentials:[{id:'Ag'}]}}).publicKey.allowCredentials[0].id],[2]));
test('untrusted origin rejected',()=>assert.throws(()=>makeAuthenticatorClient({origin:'http://public.example',fetcher:()=>{}}),/secure_origin_required/));
test('missing browser API fails closed',async()=>{let n=0;const c=makeAuthenticatorClient({origin:'https://neo.example',fetcher:()=>{n++;},credentials:null});await assert.rejects(c.enroll(),/webauthn_unavailable/);await assert.rejects(c.authenticate(),/webauthn_unavailable/);assert.equal(n,0);});
