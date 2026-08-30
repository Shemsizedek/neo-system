import test from 'node:test';
import assert from 'node:assert/strict';
import { EDUCATION_PRODUCTS, getEducationFounderBinding, authorizeEducationAction, mapExternalClassroomIdentity } from './education-authority.mjs';

test('education products reserve canonical founder as Account #1',()=>{
  assert.deepEqual(EDUCATION_PRODUCTS,['neo-cipher','gisd','neo-university','neo-classroom-bridge']);
  for(const productId of EDUCATION_PRODUCTS){
    const binding=getEducationFounderBinding(productId);
    assert.equal(binding.subjectId,'neo:founder:000001');
    assert.equal(binding.account_ordinal,1);
    assert.equal(binding.role,'founder_owner');
    assert.equal(binding.authentication_bypass,false);
  }
});

test('founder ownership alone cannot write student records, grade, or issue credentials',()=>{
  for(const [productId,action] of [['neo-cipher','student.record.write'],['neo-university','grade.assign'],['gisd','credential.issue']]){
    const result=authorizeEducationAction(productId,action,{subjectId:'neo:founder:000001',authenticated:true});
    assert.equal(result.allowed,false);
  }
});

test('authorized education actions still require scoped authority',()=>{
  const write=authorizeEducationAction('neo-cipher','student.record.write',{subjectId:'neo:founder:000001',authenticated:true,studentRecordWriteAuthorized:true,stepUpVerified:true});
  assert.equal(write.allowed,true);
  const grade=authorizeEducationAction('neo-university','grade.assign',{subjectId:'neo:founder:000001',authenticated:true,gradingAuthorized:true,facultyContextVerified:true});
  assert.equal(grade.allowed,true);
});

test('external classroom identity requires verified mapping without provider-role override',()=>{
  assert.throws(()=>mapExternalClassroomIdentity({externalUserId:'teacher-1'}),/verified/);
  const mapping=mapExternalClassroomIdentity({externalUserId:'teacher-1',verified:true});
  assert.equal(mapping.subjectId,'neo:founder:000001');
  assert.equal(mapping.providerRoleOverride,false);
  assert.equal(mapping.credentialsStored,false);
});

test('classroom bridge cannot sync grades by founder status alone',()=>{
  const denied=authorizeEducationAction('neo-classroom-bridge','classroom.grade.sync',{subjectId:'neo:founder:000001',authenticated:true});
  assert.equal(denied.allowed,false);
});
