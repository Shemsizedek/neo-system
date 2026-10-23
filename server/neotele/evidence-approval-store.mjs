// NTEL-011 PostgreSQL approval transaction; external cryptographic validation must precede this call.
export function createNeoTeleEvidenceApprovalStore({db,uuid}={}) {
 if(typeof db?.connect!=='function'||typeof uuid!=='function') throw Error('database_adapter_required');
 return async function transactionalReview({reference,decision,reviewer,approvalId,reviewEvidence}={}) {
  if(!reference||!reviewer||!approvalId||!['APPROVED','REJECTED'].includes(decision)) throw Error('invalid_review');
  if(decision==='APPROVED'&&reviewEvidence?.independentlyVerified!==true) throw Error('independent_review_required');
  const client=await db.connect();
  let begun=false;
  try {
   await client.query('BEGIN');begun=true;
   const found=await client.query('SELECT reference,submitter,status,revision,digest FROM neotele.evidence_records WHERE reference=$1 FOR UPDATE',[reference]);
   const record=found.rows[0];
   if(!record||record.status!=='PENDING_REVIEW'||record.submitter===reviewer) throw Error('review_not_permitted');
   const changed=await client.query('UPDATE neotele.evidence_records SET status=$1,reviewer=$2,approval_id=$3,revision=revision+1,reviewed_at=now() WHERE reference=$4 AND revision=$5 AND status=$6 RETURNING status,reviewed_at',[decision,reviewer,approvalId,reference,record.revision,'PENDING_REVIEW']);
   if(changed.rows.length!==1) throw Error('evidence_revision_conflict');
   await client.query('INSERT INTO neotele.evidence_audit (event_id,reference,actor,action,digest) VALUES ($1,$2,$3,$4,$5)',[uuid(),reference,reviewer,decision,record.digest]);
   await client.query('INSERT INTO neotele.audit_outbox (id,member_id,event_type,payload) VALUES ($1,$2,$3,$4)',[uuid(),reviewer,'NEOTELE_EVIDENCE_REVIEW',JSON.stringify({reference,decision,approvalId})]);
   await client.query('COMMIT');
   return {status:changed.rows[0].status,reviewedAt:changed.rows[0].reviewed_at};
  } catch(error) {if(begun) await client.query('ROLLBACK');throw error;}
  finally {client.release();}
 };
}
