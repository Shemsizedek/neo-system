import test from 'node:test';
import assert from 'node:assert/strict';
import {importComfiSource,displayExactAmount,MAX_IMPORT_BYTES} from '../../web/comfi-import.mjs';
const record={id:'a',kind:'ces_posting',ledger:'CES',account:'synthetic',reference:'1',unit:'CES:SYNTHETIC',scale:2,amount:'90000000000006.20',effectiveDate:'2026-10-25',evidenceState:'source_correlated',sourceRefs:['export-row']};
const bundle=(extra={})=>JSON.stringify({schema:'neo.comfi.source.v1',projectId:'Synthetic',records:[record],links:[],...extra});
const options={authorized:true,sourceRef:'local-export',observedAt:'2026-10-25T12:00:00Z'};
test('authorization and provenance are mandatory; malformed or oversized imports fail',()=>{
  assert.throws(()=>importComfiSource(bundle()),/authorization/);
  assert.throws(()=>importComfiSource(bundle(),{authorized:true}),/source_required/);
  assert.throws(()=>importComfiSource('x'.repeat(MAX_IMPORT_BYTES+1),options),/size_limit/);
  assert.throws(()=>importComfiSource('{}',options),/invalid_source_bundle/);
  assert.throws(()=>importComfiSource('{',options),SyntaxError);
});
test('preserves exact decimals and stamps observation without trusting imported review claims',()=>{
  const graph=importComfiSource(bundle(),options),r=graph.records[0];
  assert.equal(displayExactAmount(r),'90000000000006.20');
  assert.equal(r.evidenceState,'source_observed');assert.equal(r.observedAt,options.observedAt);
  assert.deepEqual(r.sourceRefs,['local-export','export-row']);assert.equal(graph.policy.executionEnabled,false);
  assert.equal(displayExactAmount({minorUnits:'-1',scale:2}),'-0.01');
});
test('candidate links retain source terms but cannot inherit a confirmed classification',()=>{
  const graph=importComfiSource(bundle({records:[record,{...record,id:'b',ledger:'bank',unit:'USD'}],links:[{id:'link',from:'a',to:'b',type:'conversion',status:'source_referenced',sourceRefs:['terms'],termsRef:'terms'}]}),options);
  assert.deepEqual(graph.unresolvedLinks,['link']);assert.equal(graph.links[0].status,'candidate');assert.equal(graph.policy.consolidatedValue,null);
});
test('duplicate references and numeric amounts are rejected instead of rounded or overwritten',()=>{
  assert.throws(()=>importComfiSource(bundle({records:[record,{...record,id:'b'}]}),options),/duplicate/);
  assert.throws(()=>importComfiSource(bundle({records:[{...record,amount:123}]}),options),/exact_amount/);
});
