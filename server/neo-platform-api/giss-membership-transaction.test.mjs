import test from 'node:test';
import assert from 'node:assert/strict';
import { createFirestoreMembershipGrantService } from './giss-membership-transaction.mjs';
test('transactional service requires durable Firestore transaction interface',()=>{
 assert.throws(()=>createFirestoreMembershipGrantService({db:{collection(){}}}),/firestore_transaction_required/);
});
test('invalid approval identifiers rejected before database mutation',async()=>{
 let calls=0;
 const db={collection(){return {doc(){return {};}}},async runTransaction(){calls++;}};
 const grant=createFirestoreMembershipGrantService({db});
 await assert.rejects(grant({request:{institutionId:'temple-24',subjectId:'member'},approvalId:'../../bad',operatorSubjectId:'reviewer'}),/valid_approval_id_required/);
 assert.equal(calls,0);
});
test('missing operator rejected before transaction',async()=>{
 let calls=0;
 const db={collection(){return {doc(){return {};}}},async runTransaction(){calls++;}};
 const grant=createFirestoreMembershipGrantService({db});
 await assert.rejects(grant({request:{institutionId:'temple-24',subjectId:'member'},approvalId:'approval-1'}),/operator_required/);
 assert.equal(calls,0);
});
