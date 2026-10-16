import test from 'node:test';
import assert from 'node:assert/strict';
import { validateInstitutionOnboardingRequest as validate } from './giss-institution-onboarding.mjs';

const request = { institutionId:'branch-24',name:'World Temple Branch 24',type:'moorish_branch_temple',representativeSubjectId:'subject-1',governanceEvidenceRef:'evidence:doc-1',institutionConsent:true };
test('complete request is reviewable but does not grant membership',()=>{
 const result=validate(request);
 assert.equal(result.valid,true);
 assert.equal(result.reviewRequired,true);
 assert.equal(result.membershipGranted,false);
});
test('church and independent school are supported',()=>{
 for(const type of ['church','independent_school','temple_school']) assert.equal(validate({...request,type}).valid,true);
});
test('missing institutional consent fails',()=>assert.deepEqual(validate({...request,institutionConsent:false}).errors,['institution_consent_required']));
test('missing evidence fails',()=>assert.equal(validate({...request,governanceEvidenceRef:''}).valid,false));
test('invalid identifier fails',()=>assert.equal(validate({...request,institutionId:'../../admin'}).valid,false));
