import test from 'node:test';
import assert from 'node:assert/strict';
import { createIndependentAuthorityVerifier } from './giss-independent-authority.mjs';
const request={institutionId:'temple-24',subjectId:'candidate',canApproveMemberships:true};
const authorization={decision:'approved',institutionId:'temple-24',subjectId:'candidate',authorizedBy:'authorized-1',evidenceRef:'audit:100'};
const db=(authority)=>({collection(name){return {doc(){return {async get(){return name==='gisdInstitutions'?{exists:true,data:()=>({status:'active'})}:{exists:!!authority,data:()=>authority};}}}};}});
test('verified delegating authority is accepted for review',async()=>{
 const verify=createIndependentAuthorityVerifier({db:db({active:true,institutionId:'temple-24',subjectId:'authorized-1',canDelegateApprovers:true})});
 assert.equal((await verify({request,authorization})).allowed,true);
});
test('missing independent authority denied',async()=>{
 assert.equal((await createIndependentAuthorityVerifier({db:db(null)})({request,authorization})).allowed,false);
});
test('non-delegating approver denied',async()=>{
 assert.equal((await createIndependentAuthorityVerifier({db:db({active:true,institutionId:'temple-24',subjectId:'authorized-1',canDelegateApprovers:false})})({request,authorization})).allowed,false);
});
test('self-authorization denied before registry lookup',async()=>{
 assert.equal((await createIndependentAuthorityVerifier({db:db(null)})({request,authorization:{...authorization,authorizedBy:'candidate'}})).allowed,false);
});
