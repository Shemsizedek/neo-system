import test from 'node:test';
import assert from 'node:assert/strict';
import {createComfiEvidenceGraph as graph} from './comfi-evidence.mjs';
const record=(extra={})=>({id:'token',kind:'token_issuance',ledger:'counterparty',account:'synthetic-issuer',reference:'synthetic-tx',unit:'NOMNI',scale:0,amount:'900',effectiveDate:'2016-07-22',observedAt:'2026-10-25T12:00:00Z',sourceRefs:['synthetic-source'],evidenceState:'source_observed',economicInterestId:'synthetic-interest',...extra});
test('preserves large exact decimals and native units without adding them',()=>{
  const result=graph({projectId:'SYNTHETIC',records:[record(),record({id:'vd',kind:'vdollar_posting',ledger:'vdollar',reference:'709',unit:'VDOLLAR:NMNI',scale:2,amount:'90000000000006.20'})]});
  assert.equal(result.records[1].minorUnits,'9000000000000620');assert.equal(result.records[1].unit,'VDOLLAR:NMNI');
  assert.equal(result.policy.consolidatedValue,null);assert.equal(result.sharedEconomicInterests.length,1);
});
test('reference namespace allows separate ledgers but rejects duplicate imports',()=>{
  assert.throws(()=>graph({projectId:'x',records:[record(),record({id:'second'})]}),/duplicate_ledger_reference/);
  assert.equal(graph({projectId:'x',records:[record(),record({id:'second',ledger:'ces',unit:'CES:NMNI'})]}).records.length,2);
});
test('unsafe numbers, excess precision, missing sources and invalid states are rejected',()=>{
  for(const extra of [{amount:90000000000006.2},{amount:'1.001',scale:2},{sourceRefs:[]},{evidenceState:'audited'}])assert.throws(()=>graph({projectId:'x',records:[record(extra)]}));
});
test('source-referenced conversion needs terms but never enables automatic conversion',()=>{
  const records=[record(),record({id:'ces',ledger:'ces',reference:'posting',unit:'CES:NMNI'})];
  const link={id:'bridge',from:'token',to:'ces',type:'conversion',status:'candidate'};
  assert.deepEqual(graph({projectId:'x',records,links:[link]}).unresolvedLinks,['bridge']);
  assert.throws(()=>graph({projectId:'x',records,links:[{...link,status:'source_referenced',sourceRefs:['receipt']}]}),/link_evidence_required/);
  const result=graph({projectId:'x',records,links:[{...link,status:'source_referenced',sourceRefs:['receipt'],termsRef:'synthetic-terms'}]});
  assert.equal(result.policy.automaticConversion,false);assert.deepEqual(result.unresolvedLinks,[]);
});
test('bank evidence does not confer government eligibility, recognized value or execution',()=>{
  const result=graph({projectId:'x',records:[record({kind:'external_bank_statement',ledger:'bank',unit:'USD',scale:2,amount:'1000.00'})]});
  assert.equal(result.policy.governmentEligibility,'not_determined');assert.equal(result.policy.executionEnabled,false);assert.equal(result.policy.automaticAssetRecognition,false);
});
test('dangling and self links are rejected',()=>{
  for(const to of ['missing','token'])assert.throws(()=>graph({projectId:'x',records:[record()],links:[{id:'bad',from:'token',to,type:'represents',status:'candidate'}]}));
});
