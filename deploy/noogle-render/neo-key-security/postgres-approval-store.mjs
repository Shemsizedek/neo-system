// Separate server-only bootstrap approval store. Approver private keys never
// enter this database, and approval consumption occurs in registration SQL.
export function createPostgresNeoKeyApprovalStore(pool){
  if(typeof pool?.query!=='function')throw Error('neo_key_approval_postgres_required');
  return Object.freeze({
    async insertApproval(p){
      await pool.query(`INSERT INTO neo_key_bootstrap_approvals
        (authorization_ref,subject_id,rp_id,origin,expires_at,approver_one,approver_two)
        VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [p.authorizationRef,p.subject,p.rpId,p.origin,p.expiresAt,
         p.approverIds[0],p.approverIds[1]]);
    },
    async findValidApproval(p){
      const result=await pool.query(`SELECT authorization_ref,subject_id,rp_id,origin,
        approver_one,approver_two FROM neo_key_bootstrap_approvals
        WHERE authorization_ref=$1 AND subject_id=$2 AND rp_id=$3
          AND origin=$4 AND expires_at>$5 AND consumed_at IS NULL`,
        [p.authorizationRef,p.subject,p.rpId,p.origin,p.now]);
      if(result.rows.length!==1)return null;
      const r=result.rows[0];
      return {authorizationRef:r.authorization_ref,subject:r.subject_id,
        rpId:r.rp_id,origin:r.origin,
        approverCount:r.approver_one&&r.approver_two&&r.approver_one!==r.approver_two?2:0};
    }
  });
}
