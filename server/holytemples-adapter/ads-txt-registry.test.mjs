import test from 'node:test';
import assert from 'node:assert/strict';
import {FAMILY_OFFICE_ADS_REGISTRY,familyOfficeAdsEvidence,renderAdsTxt,validateAdsRegistry} from './ads-txt-registry.mjs';

test('family office ads registry renders canonical Google seller record',()=>{
  assert.equal(renderAdsTxt(FAMILY_OFFICE_ADS_REGISTRY),'google.com, pub-7219200716649339, DIRECT, f08c47fec0942fa0\n');
  assert.deepEqual(familyOfficeAdsEvidence(),{ok:true,host:'office.holytemples.org',recordCount:1,observations:[]});
});

test('validator rejects malformed and duplicate records',()=>{
  const result=validateAdsRegistry({records:[
    {domain:'google.com',publisherId:'pub-1',relationship:'DIRECT',certificationAuthorityId:'abc'},
    {domain:'google.com',publisherId:'pub-1',relationship:'direct',certificationAuthorityId:'abc'},
    {domain:'bad host',publisherId:'',relationship:'MAYBE'}
  ]});
  assert.equal(result.valid,false);
  assert.equal(result.records.length,1);
  assert.ok(result.observations.some(o=>o.code==='duplicate_record'));
  assert.ok(result.observations.some(o=>o.code==='invalid_record'));
});
