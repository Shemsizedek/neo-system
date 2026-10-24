import test from 'node:test';
import assert from 'node:assert/strict';
import {createNeoTeleOperatorApproval,createNeoTeleOperatorSummary} from './operator-approval.mjs';
const subject='reviewer1';
const deps={
 resolveSession:async()=>({verified:true,subject}),
 loadRole:async()=>({verified:true,subject,name:'NOOGLE_COMPLIANCE_REVIEWER'}),
 verifyGuardianApproval:async({reference,decision})=>({verified:true,subject,reference,decision,id:'approval1'}),
 transactionalReview:async({decision})=>({status:decision,reviewedAt:'2026-10-16T00:00:00Z'})
};
const req={sessionToken:'token',reference:'contract1',decision:'APPROVED',guardianAssertion:'signed',reviewEvidence:{independentlyVerified:true}};
test('authorized signed review has no activation side effect',async()=>{
 const result=await createNeoTeleOperatorApproval(deps)(req);
 assert.equal(result.status,'APPROVED');assert.equal(result.activationEnabled,false);
});
test('unverified session and reviewer cannot approve',async()=>{
 await assert.rejects(()=>createNeoTeleOperatorApproval({...deps,resolveSession:async()=>({verified:false,subject})})(req),/neopass_authentication_required/);
 await assert.rejects(()=>createNeoTeleOperatorApproval({...deps,loadRole:async()=>({verified:true,subject,name:'MEMBER'})})(req),/operator_role_required/);
});
test('guardian assertion and independent review required',async()=>{
 await assert.rejects(()=>createNeoTeleOperatorApproval({...deps,verifyGuardianApproval:async()=>({verified:false})})(req),/guardian_approval_required/);
 await assert.rejects(()=>createNeoTeleOperatorApproval(deps)({...req,reviewEvidence:{}}),/independent_evidence_review_required/);
});
test('dashboard redacts evidence content and remains read-only',async()=>{
 const summary=await createNeoTeleOperatorSummary({getEvidence:async()=>[{type:'carrierAgreement',reference:'ref1',status:'PENDING_REVIEW',secret:'hidden'}],getFunding:async()=>({monthlyGapCents:100,monthlyObligationCents:300})})({subject});
 assert.equal(summary.liveCarrierActivation,false);assert.equal(JSON.stringify(summary).includes('hidden'),false);
});
