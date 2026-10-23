import test from 'node:test';import assert from 'node:assert/strict';
import {createNomniCrownTrustRegistry} from './nomni-crown-trust-registry.mjs';
const entry={key_id:'crown-one',public_key_pem:'fixture-only-public-key',valid_from:'2026-01-01T00:00:00Z',valid_until:'2027-01-01T00:00:00Z',status:'active'};
test('active and valid trust entry resolves without publishing key materials',()=>{
 const r=createNomniCrownTrustRegistry([entry],{now:()=>Date.parse('2026-10-23T00:00:00Z')});
 assert.equal(r.getTrustedKey('crown-one'),entry.public_key_pem);
 assert.equal(r.publicStatus()[0].public_key_pem,undefined);
});
test('revoked, expired and unknown keys fail closed',()=>{
 const r=createNomniCrownTrustRegistry([{...entry,status:'revoked'}],{now:()=>Date.parse('2026-10-23T00:00:00Z')});
 assert.equal(r.getTrustedKey('crown-one'),null);assert.equal(r.getTrustedKey('missing'),null);
 const old=createNomniCrownTrustRegistry([entry],{now:()=>Date.parse('2027-10-23T00:00:00Z')});
 assert.equal(old.getTrustedKey('crown-one'),null);
});
