// CSC-GISS-014: build an approval-bound membership grant for a trusted
// operator workflow. This function performs no database writes.
const ROLES = new Set(['institution_admin','temple_officer','instructor','student','auditor']);
const ID = /^[A-Za-z0-9_-]{1,80}$/;
export function prepareInstitutionMembershipGrant({request,approval,actor}={}) {
  const errors=[];
  if(!ID.test(request?.institutionId??'')) errors.push('institution_id_required');
  if(typeof request?.subjectId!=='string'||!request.subjectId.trim()) errors.push('subject_required');
  if(!ROLES.has(request?.role)) errors.push('unsupported_role');
  if(approval?.decision!=='approved') errors.push('approval_required');
  if(typeof approval?.evidenceRef!=='string'||!approval.evidenceRef.trim()) errors.push('approval_evidence_required');
  if(typeof approval?.approvedBy!=='string'||!approval.approvedBy.trim()) errors.push('approver_required');
  if(approval?.institutionId!==request?.institutionId) errors.push('approval_institution_mismatch');
  if(approval?.subjectId!==request?.subjectId||approval?.role!==request?.role) errors.push('approval_scope_mismatch');
  if(typeof actor?.subjectId!=='string'||actor.subjectId!==approval?.approvedBy) errors.push('operator_identity_mismatch');
  if(approval?.approvedBy===request?.subjectId) errors.push('self_approval_denied');
  if(errors.length) return {allowed:false,errors,grant:null};
  return {allowed:true,errors:[],grant:{institutionId:request.institutionId,subjectId:request.subjectId,role:request.role,active:true,approvalEvidenceRef:approval.evidenceRef,approvedBy:approval.approvedBy}};
}
