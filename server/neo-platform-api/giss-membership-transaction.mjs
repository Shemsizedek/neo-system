import { createHash } from 'node:crypto';
import { prepareInstitutionMembershipGrant } from './giss-membership-grant.mjs';

// CSC-GISS-015. Only a separately approved operator process may invoke this.
// Approver authority comes from persisted authorization, never caller claims.
export function createFirestoreMembershipGrantService({db,now=()=>new Date().toISOString()}={}) {
  if(typeof db?.runTransaction!=='function'||typeof db?.collection!=='function') throw new Error('firestore_transaction_required');
  const institutions=db.collection('gisdInstitutions');
  const members=db.collection('gisdInstitutionMemberships');
  const approvals=db.collection('gisdMembershipApprovals');
  const auditors=db.collection('gisdMembershipAudit');
  const authorities=db.collection('gisdMembershipApprovers');
  return async function applyApprovedMembership({request,approvalId,operatorSubjectId}={}) {
    if(typeof approvalId!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(approvalId)) throw new Error('valid_approval_id_required');
    if(typeof operatorSubjectId!=='string'||!operatorSubjectId.trim()) throw new Error('operator_required');
    const institutionId=request?.institutionId,subjectId=request?.subjectId;
    if(typeof institutionId!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(institutionId)||typeof subjectId!=='string'||!subjectId.trim()) throw new Error('invalid_membership_scope');
    const key=createHash('sha256').update(JSON.stringify([institutionId,subjectId])).digest('hex');
    const membershipRef=members.doc(key),approvalRef=approvals.doc(approvalId),auditRef=auditors.doc(approvalId);
    const institutionRef=institutions.doc(institutionId);
    const authorityRef=authorities.doc(createHash('sha256').update(JSON.stringify([institutionId,operatorSubjectId])).digest('hex'));
    return db.runTransaction(async tx=>{
      // All reads precede writes in a Firestore transaction.
      const [institutionSnap,authoritySnap,approvalSnap,membershipSnap,auditSnap]=await Promise.all([
        tx.get(institutionRef),tx.get(authorityRef),tx.get(approvalRef),tx.get(membershipRef),tx.get(auditRef)
      ]);
      if(!institutionSnap.exists||institutionSnap.data()?.status!=='active') throw new Error('active_institution_required');
      const authority=authoritySnap.exists?authoritySnap.data():null;
      if(!authority||authority.active!==true||authority.institutionId!==institutionId||authority.subjectId!==operatorSubjectId||authority.canApproveMemberships!==true) throw new Error('approver_not_authorized');
      if(!approvalSnap.exists) throw new Error('recorded_approval_required');
      const approval=approvalSnap.data();
      if(approval.consumed===true||auditSnap.exists) throw new Error('approval_already_consumed');
      const result=prepareInstitutionMembershipGrant({request,approval,actor:{subjectId:operatorSubjectId}});
      if(!result.allowed) throw new Error('membership_approval_invalid:'+result.errors.join(','));
      if(membershipSnap.exists&&membershipSnap.data()?.active===true) throw new Error('active_membership_exists');
      const timestamp=now();
      tx.set(membershipRef,{...result.grant,createdAt:timestamp,approvalId});
      tx.update(approvalRef,{consumed:true,consumedAt:timestamp});
      tx.create(auditRef,{event:'institution_membership_granted',institutionId,subjectId,role:request.role,approvalId,operatorSubjectId,timestamp});
      return {institutionId,subjectId,role:request.role,approvalId,recorded:true};
    });
  };
}
