import {test} from 'node:test';
import assert from 'node:assert/strict';
import {authorizeRoute,PROVIDERS} from './provider-registry.mjs';
test('every declared integration has an isolated capability set',()=>{
  assert.equal(PROVIDERS.wpvibe.capabilities.includes('inbound-read'),false);
  assert.equal(PROVIDERS.titan.capabilities.includes('site-admin'),false);
});
test('no automatic cross-provider substitution',()=>{
  assert.deepEqual(authorizeRoute({provider:'wpvibe',capability:'inbound-read',grant:{provider:'wpvibe',capability:'inbound-read',verified:true}}),{allowed:false,reason:'unsupported_capability'});
  assert.deepEqual(authorizeRoute({provider:'titan',capability:'inbound-read',grant:{provider:'wpvibe',capability:'inbound-read',verified:true}}),{allowed:false,reason:'authorization_required'});
});
test('explicit verified grant is required for an authorized adapter',()=>{
  assert.deepEqual(authorizeRoute({provider:'titan',capability:'inbound-read'}),{allowed:false,reason:'authorization_required'});
  assert.deepEqual(authorizeRoute({provider:'titan',capability:'inbound-read',grant:{provider:'titan',capability:'inbound-read',verified:true}}),{allowed:true});
});
