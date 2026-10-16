// NTEL-010 trust boundary: all approvals require server-verified NEOpass roles and Guardian proof.
export function createNeoTeleOperatorApproval({resolveSession,loadRole,verifyGuardianApproval,transactionalReview}={}) {
 for(const [key,fn] of Object.entries({resolveSession,loadRole,verifyGuardianApproval,transactionalReview})) if(typeof fn!=='function') throw Error('adapter_required:'+key);
 return async function approve({sessionToken,reference,decision,guardianAssertion,reviewEvidence}={}) {
  if(typeof reference!=='string'||!reference||!['APPROVED','REJECTED'].includes(decision)) throw Error('invalid_review_request');
  const session=await resolveSession(sessionToken);
  if(!session?.verified||!session.subject) throw Error('neopass_authentication_required');
  const role=await loadRole(session.subject);
  if(!role?.verified||role.subject!==session.subject||!['CHAPLAINCY_ADMIN','NOOGLE_COMPLIANCE_REVIEWER'].includes(role.name)) throw Error('operator_role_required');
  const approval=await verifyGuardianApproval({subject:session.subject,reference,decision,assertion:guardianAssertion});
  if(approval?.verified!==true||approval.subject!==session.subject||approval.reference!==reference||approval.decision!==decision) throw Error('guardian_approval_required');
  if(decision==='APPROVED'&&reviewEvidence?.independentlyVerified!==true) throw Error('independent_evidence_review_required');
  // transactionalReview must atomically enforce separation of duties,
  // reviewer identity, immutable audit/outbox and revision-based concurrency.
  const result=await transactionalReview({reference,decision,reviewer:session.subject,approvalId:approval.id,reviewEvidence});
  return {reference,status:result.status,reviewedAt:result.reviewedAt??null,activationEnabled:false};
 };
}
export function createNeoTeleOperatorSummary({getEvidence,getFunding}={}) {
 if(typeof getEvidence!=='function'||typeof getFunding!=='function') throw Error('adapters_required');
 return async({subject})=>{
  if(!subject) throw Error('authenticated_subject_required');
  const [evidence,funding]=await Promise.all([getEvidence({subject}),getFunding({subject})]);
  if(!Array.isArray(evidence)||!funding) throw Error('dashboard_unavailable');
  return {provider:'Noogle Telecommunications',pilot:'chaplaincy',
   evidence:evidence.map(x=>({type:x.type,reference:x.reference,status:x.status})),
   funding:{monthlyGapCents:funding.monthlyGapCents,monthlyObligationCents:funding.monthlyObligationCents},
   liveCarrierActivation:false};
 };
}
