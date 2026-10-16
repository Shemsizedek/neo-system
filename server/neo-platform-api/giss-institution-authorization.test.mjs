import test from 'node:test';
import assert from 'node:assert/strict';
import { authorizeInstitutionAction as authorize } from './giss-institution-authorization.mjs';

const member = {subjectId:'member-1',memberships:[{institutionId:'branch-24',role:'institution_admin',active:true}]};
test('admin may manage courses in own institution',()=>assert.equal(authorize({actor:member,institutionId:'branch-24',action:'courses.manage'}).allowed,true));
test('admin cannot access another institution',()=>assert.equal(authorize({actor:member,institutionId:'church-1',action:'courses.manage'}).allowed,false));
test('admin cannot approve appointments',()=>assert.equal(authorize({actor:member,institutionId:'branch-24',action:'appointments.approve'}).allowed,false));
test('inactive membership cannot authorize',()=>assert.equal(authorize({actor:{...member,memberships:[{...member.memberships[0],active:false}]},institutionId:'branch-24',action:'courses.manage'}).allowed,false));
test('student sees own progress only',()=>{
  const actor={subjectId:'student-1',memberships:[{institutionId:'school-1',role:'student',active:true}]};
  assert.equal(authorize({actor,institutionId:'school-1',action:'progress.read.own',resourceOwnerId:'student-1'}).allowed,true);
  assert.equal(authorize({actor,institutionId:'school-1',action:'progress.read.own',resourceOwnerId:'student-2'}).allowed,false);
});
test('unsupported roles fail closed',()=>assert.equal(authorize({actor:{subjectId:'x',memberships:[{institutionId:'branch-24',role:'platform_root',active:true}]},institutionId:'branch-24',action:'courses.manage'}).allowed,false));
