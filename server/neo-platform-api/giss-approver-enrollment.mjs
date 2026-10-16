// CSC-GISS-016: approval-authority enrollment request validation.
// This does not bootstrap root administrators, create approvers or write data.
const ID=/^[A-Za-z0-9_-]{1,80}$/;
export function validateApproverEnrollment({request,authorization}={}) {
 const errors=[];
 if(!ID.test(request?.institutionId??'')) errors.push('institution_id_required');
 if(typeof request?.subjectId!=='string'||!request.subjectId.trim()) errors.push('subject_required');
 if(request?.canApproveMemberships!==true) errors.push('explicit_permission_required');
 if(authorization?.decision!=='approved') errors.push('approval_required');
 if(authorization?.institutionId!==request?.institutionId||authorization?.subjectId!==request?.subjectId) errors.push('approval_scope_mismatch');
 if(typeof authorization?.evidenceRef!=='string'||!authorization.evidenceRef.trim()) errors.push('evidence_required');
 if(typeof authorization?.authorizedBy!=='string'||!authorization.authorizedBy.trim()) errors.push('authorizer_required');
 if(authorization?.authorizedBy===request?.subjectId) errors.push('self_authorization_denied');
 return {valid:errors.length===0,errors,writeAuthorized:false,requiresIndependentAuthorityVerification:true};
}
