import test from 'node:test';
import assert from 'node:assert/strict';
import {assessNoogleReadiness,REQUIRED_OPERATIONS_EVIDENCE} from './operations-readiness.mjs';
test('no evidence means no free-service or activation claim',()=>{
 const r=assessNoogleReadiness();
 assert.equal(r.readiness,'BLOCKED');assert.equal(r.activationEnabled,false);
 assert.equal(r.fundingVerified,false);
});
test('funding requires coverage for entire pilot and verified evidence',()=>{
 const evidence=Object.fromEntries(REQUIRED_OPERATIONS_EVIDENCE.map(k=>[k,{verified:true,reference:'evidence-'+k,verifiedAt:'2026-10-16'}]));
 const plan={fundingType:'SPONSORED',wholesaleMonthlyCost:12,pilotSubscribers:20,monthlyCommittedFunding:100};
 const r=assessNoogleReadiness({evidence,plan});
 assert.equal(r.monthlyRequirement,240);assert.equal(r.readiness,'BLOCKED');
 const funded=assessNoogleReadiness({evidence,plan:{...plan,monthlyCommittedFunding:240}});
 assert.equal(funded.readiness,'EVIDENCE_REVIEW_READY');assert.equal(funded.activationEnabled,false);
});
test('Lifeline needs separate authorization and enrollment evidence',()=>{
 const evidence=Object.fromEntries(REQUIRED_OPERATIONS_EVIDENCE.map(k=>[k,{verified:true,reference:'record-'+k,verifiedAt:'2026-10-16'}]));
 const plan={fundingType:'LIFELINE',wholesaleMonthlyCost:10,pilotSubscribers:1,monthlyCommittedFunding:20};
 assert.equal(assessNoogleReadiness({evidence,plan}).readiness,'BLOCKED');
});
