import test from 'node:test';
import assert from 'node:assert/strict';
import {observeNmniBankFromUsersHtml} from './ces-nmni-target-observation.mjs';

test('exact NMNIBANK Users row yields candidate evidence, never ownership',()=>{
 const html='<table><tr><td>NMNIBANK</td><td>PERSONAL RECORD NOT FOR LOGGING</td></tr><tr><td>ANOTHER</td></tr></table>';
 const r=observeNmniBankFromUsersHtml(html);
 assert.deepEqual(r,{inspected:true,identifierVisible:true,recordRowVisible:true,
  controllerVerified:false,delegationVerified:false});
 assert.doesNotMatch(JSON.stringify(r),/PERSONAL RECORD|ANOTHER/);
});
test('HTML comments and script tags cannot fabricate visible NMNIBANK',()=>{
 for(const html of [
  '<script>const p="NMNIBANK";</script>',
  '<!-- NMNIBANK --><table><tr><td>ANOTHER</td></tr></table>',
  '<style>.NMNIBANK{color:blue}</style>',
  '<template><tr><td>NMNIBANK</td></tr></template>'
 ]) {
  const r=observeNmniBankFromUsersHtml(html);
  assert.equal(r.identifierVisible,false);
  assert.equal(r.recordRowVisible,false);
 }
});
test('unrelated bank names do not produce false matches',()=>{
 for(const input of [
  '<table><tr><td>XCPCBANK</td></tr></table>',
  '<table><tr><td>NMNIBANK2</td></tr></table>',
  '<table><tr><td>NMNI0000</td></tr></table>'
 ]) {
  assert.equal(observeNmniBankFromUsersHtml(input).recordRowVisible,false);
 }
});
test('plain-text identifier does not establish an account row or control',()=>{
 const r=observeNmniBankFromUsersHtml('<div>NMNIBANK</div>');
 assert.equal(r.identifierVisible,true);
 assert.equal(r.recordRowVisible,false);
 assert.equal(r.controllerVerified,false);
});
test('unbounded or absent HTML is rejected before inspection',()=>{
 for(const x of ['',null,1,'X'.repeat(512*1024+1)]){
  assert.deepEqual(observeNmniBankFromUsersHtml(x),{
    inspected:false,identifierVisible:false,recordRowVisible:false,
    controllerVerified:false,delegationVerified:false});
 }
});
