// Inactive, server-side transactional execution contract. No HTTP routes.
// Approval is an opaque trusted verifier result, not caller-supplied JSON.
export function createApprovedDeviceExecutor({pool,verifyApproval}) {
 if(typeof pool?.connect!=='function'||typeof verifyApproval!=='function')
   throw Error('trusted_execution_dependencies_required');
 return async function execute({approval,subject,deviceId,action,label,now}) {
  if(typeof subject!=='string'||!subject||typeof deviceId!=='string'||!deviceId||
    !['devices.rename','devices.revoke'].includes(action) ||
    (action==='devices.rename' && (typeof label!=='string'||!label.trim()||label.length>80)))
    throw Error('invalid_action');
  const normalizedLabel=action==='devices.rename'?label.trim():null;
  const verified=await verifyApproval({approval,subject,deviceId,action,label:normalizedLabel});
  if(!verified||verified.subject!==subject||verified.deviceId!==deviceId||
     verified.action!==action||verified.label!==normalizedLabel||
     typeof verified.approvalId!=='string'||!verified.approvalId)
     throw Error('approval_required');
  const client=await pool.connect();
  let inTransaction=false;
  try {
   await client.query('BEGIN');inTransaction=true;
   const consume=await client.query(
    'UPDATE noogle_connect_approvals SET consumed_at=$3 WHERE id=$1 AND subject_id=$2 AND consumed_at IS NULL AND expires_at>$3 AND action=$4 AND device_id=$5 AND label IS NOT DISTINCT FROM $6 RETURNING id',
    [verified.approvalId,subject,now,action,deviceId,normalizedLabel]);
   if(consume.rows.length!==1)throw Error('approval_replayed_or_expired');
   const mutation=action==='devices.rename'
    ?await client.query('UPDATE noogle_connect_devices SET label=$3 WHERE subject_id=$1 AND id=$2 AND revoked_at IS NULL RETURNING id',[subject,deviceId,normalizedLabel])
    :await client.query('UPDATE noogle_connect_devices SET revoked_at=$3 WHERE subject_id=$1 AND id=$2 AND revoked_at IS NULL RETURNING id',[subject,deviceId,now]);
   if(mutation.rows.length!==1)throw Error('device_not_found');
   await client.query('INSERT INTO noogle_connect_device_audit(approval_id,subject_id,device_id,action,occurred_at) VALUES($1,$2,$3,$4,$5)',
    [verified.approvalId,subject,deviceId,action,now]);
   await client.query('COMMIT');inTransaction=false;
   return {deviceId,action,applied:true};
  } catch(error) {
   if(inTransaction)await client.query('ROLLBACK');
   throw error;
  } finally {client.release();}
 };
}
