// NIBIRU-027: transactional write helpers. Do not mount without verified NEOpass session.
const ID=/^[A-Z0-9][A-Z0-9_-]{3,79}$/;
const STAGES=new Set(['research','due_diligence','underwriting','approval_required','on_hold','archived']);
function guard(session,permission){
 if(!session?.authenticated||!session?.subject)throw Error('authentication_required');
 if(session.neopassStatus!=='active')throw Error('active_neopass_required');
 const roles=permission==='create'?['executive-admin','deal-desk-analyst']:['executive-admin','deal-desk-reviewer'];
 if(!roles.includes(session.role))throw Error('permission_denied');
}
async function transaction(pool,run){
 if(typeof pool?.connect!=='function')throw Error('transactional_pool_required');
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  const result=await run(client);
  await client.query('COMMIT');
  return result;
 }catch(error){
  try{await client.query('ROLLBACK')}catch{}
  throw error;
 }finally{client.release()}
}
export function createTransactionalOpportunityWriter({pool}={}){
 return Object.freeze({
  async create({session,input}){
   guard(session,'create');
   const {id,opportunity_name,asset_category,source_project}=input||{};
   if(!ID.test(id)||![opportunity_name,asset_category,source_project].every(v=>typeof v==='string'&&v.trim()))throw Error('invalid_opportunity');
   return transaction(pool,async client=>{
    const result=await client.query(`INSERT INTO private_deal_opportunities
    (id,opportunity_name,asset_category,source_project)
    VALUES ($1,$2,$3,$4)
    RETURNING id,stage,confidentiality,verification_status,offering_status`,
    [id,opportunity_name,asset_category,source_project]);
    await client.query(`INSERT INTO private_deal_opportunity_audit
    (opportunity_id,actor_subject,action) VALUES ($1,$2,$3)`,
    [id,session.subject,'opportunity_created']);
    return result.rows[0];
   });
  },
  async changeStage({session,id,stage}){
   guard(session,'review');
   if(!ID.test(id)||!STAGES.has(stage))throw Error('invalid_stage_change');
   return transaction(pool,async client=>{
    const result=await client.query(`UPDATE private_deal_opportunities
     SET stage=$2,updated_at=now() WHERE id=$1 AND confidentiality='restricted'
     RETURNING id,stage,offering_status`,[id,stage]);
    if(!result.rows[0])throw Error('opportunity_not_found');
    await client.query(`INSERT INTO private_deal_opportunity_audit
     (opportunity_id,actor_subject,action,stage) VALUES ($1,$2,$3,$4)`,
     [id,session.subject,'stage_changed',stage]);
    return result.rows[0];
   });
  }
 });
}
