import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareInstitutionMembershipGrant as prepare} from './giss-membership-grant.mjs';
const request={institutionId:'temple-24',subjectId:'member-2',role:'institution_admin'};
const approval={decision:'approved',evidenceRef:'audit:42',approvedBy:'reviewer-1',institutionId:'temple-24',subjectId:'member-2',role:'institution_admin'};
const actor={subjectId:'reviewer-1'};
test('matching approval yields grant proposal without persistence',()=>{
 const result=prepare({request,approval,actor});
 assert.equal(result.allowed,true);assert.equal(result.grant.active,true);
});
test('no approval denied',()=>assert.equal(prepare({request,actor}).allowed,false));
test('cross institution approval denied',()=>assert.equal(prepare({request,approval:{...approval,institutionId:'other'},actor}).allowed,false));
test('scope mismatch denied',()=>assert.equal(prepare({request,approval:{...approval,role:'student'},actor}).allowed,false));
test('self approval denied',()=>assert.equal(prepare({request,approval:{...approval,approvedBy:'member-2'},actor:{subjectId:'member-2'}}).allowed,false));
test('unrecognized role denied',()=>assert.equal(prepare({request:{...request,role:'superuser'},approval,actor}).allowed,false));
