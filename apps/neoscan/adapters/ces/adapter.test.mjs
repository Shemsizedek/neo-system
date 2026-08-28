import test from 'node:test';
import assert from 'node:assert/strict';
import {createCesAdapter,CES_SCHEMA} from './adapter.mjs';

test('CES adapter is read-only and unconfigured without endpoint/account',()=>{
  const adapter=createCesAdapter();
  assert.deepEqual(adapter.status(),{schema:CES_SCHEMA,configured:false,endpoint:null,network:null,account:null,authMode:'bearer',readOnly:true});
});

test('normalization preserves CES provenance and native unit',()=>{
  const adapter=createCesAdapter({endpoint:'https://example.invalid/api/',network:'demo',account:'ABC123'});
  const row=adapter.normalizeEntry({id:'tx-1',currency:'CES',amount:'12.5',timestamp:'2026-08-28T14:00:00Z'});
  assert.equal(row.source,'ces');
  assert.equal(row.reference,'tx-1');
  assert.equal(row.unit,'CES');
  assert.equal(row.amount,12.5);
  assert.equal(row.verificationStatus,'verified');
  assert.equal(row.account,'ABC123');
});

test('normalization rejects records without provenance fields',()=>{
  const adapter=createCesAdapter({endpoint:'https://example.invalid/',account:'ABC123'});
  assert.throws(()=>adapter.normalizeEntry({amount:5}),/missing required provenance fields/);
});
