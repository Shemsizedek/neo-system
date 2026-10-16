import test from 'node:test';
import assert from 'node:assert/strict';
import {validateApproverEnrollment as validate} from './giss-approver-enrollment.mjs';
const request={institutionId:'temple-24',subjectId:'reviewer-2',canApproveMemberships:true};
const authorization={decision:'approved',institutionId:'temple-24',subjectId:'reviewer-2',evidenceRef:'approval:100',authorizedBy:'reviewer-1'};
test('matching request remains non-writing pending independent verification',()=>{
 const result=validate({request,authorization});
 assert.equal(result.valid,true);assert.equal(result.writeAuthorized,false);
 assert.equal(result.requiresIndependentAuthorityVerification,true);
});
test('self authorization is denied',()=>assert.equal(validate({request,authorization:{...authorization,authorizedBy:'reviewer-2'}}).valid,false));
test('cross institution scope is denied',()=>assert.equal(validate({request,authorization:{...authorization,institutionId:'other'}}).valid,false));
test('missing approval evidence denied',()=>assert.equal(validate({request,authorization:{...authorization,evidenceRef:''}}).valid,false));
test('no explicit permission denied',()=>assert.equal(validate({request:{...request,canApproveMemberships:false},authorization}).valid,false));
