import test from 'node:test';
import assert from 'node:assert/strict';
import {validateOrangeChip,summarizeOrangeChip} from '../../src/neo-digital-capital/orange-chip-registry.mjs';
const fixture={id:'OC-DEMO-001',name:'Illustrative Orange Equity',asset_class:'equity',network:'bitcoin',protocol:'counterparty',issuer:'Example issuer (not a real offering)',verification_status:'unverified',legal_rights_status:'unknown',source_refs:[],supply:'100000.00000000'};
test('valid read-only illustrative record',()=>{assert.equal(validateOrangeChip(fixture).valid,true);assert.equal(summarizeOrangeChip(fixture).market_eligible,false)});
test('rejects unsupported rails',()=>assert.equal(validateOrangeChip({...fixture,network:'other'}).valid,false));
test('rejects floating-point supply',()=>assert.equal(validateOrangeChip({...fixture,supply:1.25}).valid,false));
test('rejects missing issuer',()=>assert.equal(validateOrangeChip({...fixture,issuer:''}).valid,false));
