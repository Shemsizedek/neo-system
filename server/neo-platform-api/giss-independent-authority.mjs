// CSC-GISS-017: independently check persisted authority before approving a
// delegation. This is read-only and cannot bootstrap an initial approver.
import { createHash } from 'node:crypto';
import { validateApproverEnrollment } from './giss-approver-enrollment.mjs';

export function createIndependentAuthorityVerifier({db}={}) {
 if(typeof db?.collection!=='function') throw new Error('trusted_registry_required');
 return async function verify({request,authorization}={}) {
  const checked=validateApproverEnrollment({request,authorization});
  if(!checked.valid) return {allowed:false,errors:checked.errors};
  const {institutionId}=request;
  const authorizerId=authorization.authorizedBy;
  const authorityKey=createHash('sha256').update(JSON.stringify([institutionId,authorizerId])).digest('hex');
  const [institutionSnap,authoritySnap]=await Promise.all([
   db.collection('gisdInstitutions').doc(institutionId).get(),
   db.collection('gisdMembershipApprovers').doc(authorityKey).get()
  ]);
  if(!institutionSnap.exists||institutionSnap.data()?.status!=='active') return {allowed:false,errors:['inactive_institution']};
  const authority=authoritySnap.exists?authoritySnap.data():null;
  if(!authority||authority.active!==true||authority.institutionId!==institutionId||authority.subjectId!==authorizerId||authority.canDelegateApprovers!==true)
   return {allowed:false,errors:['independent_authority_not_verified']};
  return {allowed:true,errors:[],evidenceRef:authorization.evidenceRef,authorizerId};
 };
}
