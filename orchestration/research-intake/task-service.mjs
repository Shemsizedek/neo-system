// Trusted server-side authentication and authorization dependencies.
export function createTaskService({pool,authenticate,authorization}) {
  const validId=x=>typeof x==='string'&&x.length>0&&x.length<=512;
  const validHash=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
  return Object.freeze({
    async register(context,taskId,payloadHash) {
      if(!validId(taskId)||!validHash(payloadHash)) return 'INVALID';
      const principal=await authenticate(context);
      if(!principal||!await authorization.canRegister(principal,taskId,payloadHash)) return 'DENIED';
      const inserted=await pool.query("INSERT INTO neo_relay.tasks(task_id,payload_hash) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING task_id",[taskId,payloadHash]);
      if(inserted.rows.length===1) return 'QUEUED';
      const existing=await pool.query("SELECT payload_hash FROM neo_relay.tasks WHERE task_id=$1",[taskId]);
      return existing.rows.length===1&&existing.rows[0].payload_hash===payloadHash?'DUPLICATE':'CONFLICT';
    },
    async claim(context,taskId,payloadHash) {
      if(!validId(taskId)||!validHash(payloadHash)) return false;
      const principal=await authenticate(context);
      if(!principal||!validId(principal.agentId)||!await authorization.canClaim(principal,taskId,payloadHash)) return false;
      const result=await pool.query("UPDATE neo_relay.tasks SET state='CLAIMED',owner_id=$2,claimed_at=clock_timestamp() WHERE task_id=$1 AND state='QUEUED' AND payload_hash=$3 RETURNING task_id",[taskId,principal.agentId,payloadHash]);
      return result.rows.length===1;
    }
  });
}
