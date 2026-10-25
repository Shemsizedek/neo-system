// NIBIRU-026: PostgreSQL adapters for NIA-013's existing private opportunity service.
// Attach only inside a server route after independently verified NEOpass identity.
// Accept an injected pg-compatible pool. Never expose this module through static hosting.
const ID=/^[A-Z0-9][A-Z0-9_-]{3,79}$/;
function validId(id){if(typeof id!=='string'||!ID.test(id))throw new Error('invalid_opportunity_id');return id;}
function poolCheck(db){if(!db||typeof db.query!=='function')throw new Error('database_pool_required');}
export function createPostgresOpportunityAdapters({db}={}){
  poolCheck(db);
  const storage={
    async insert(record){
      const id=validId(record.id);
      const result=await db.query(
        `INSERT INTO private_deal_opportunities
          (id,parent_system,opportunity_name,asset_category,source_project,stage,confidentiality,
           verification_status,offering_status,owner_review_status,evidence_manifest_ref)
         VALUES ($1,'NIA-013',$2,$3,$4,'research','restricted','unverified','not_authorized','pending',NULL)
         RETURNING id,parent_system,opportunity_name,asset_category,source_project,stage,
           confidentiality,verification_status,offering_status,owner_review_status,evidence_manifest_ref`,
        [id,record.opportunity_name,record.asset_category,record.source_project]);
      return result.rows[0];
    },
    async get(id){
      const result=await db.query(
        `SELECT id,parent_system,opportunity_name,asset_category,source_project,stage,confidentiality,
           verification_status,offering_status,owner_review_status,evidence_manifest_ref
         FROM private_deal_opportunities WHERE id=$1 AND confidentiality='restricted'`,
        [validId(id)]);
      return result.rows[0]||null;
    },
    async list(){
      const result=await db.query(
        `SELECT id,parent_system,opportunity_name,asset_category,source_project,stage,confidentiality,
           verification_status,offering_status,owner_review_status,evidence_manifest_ref
         FROM private_deal_opportunities WHERE confidentiality='restricted'
         ORDER BY created_at DESC LIMIT 100`,[]);
      return result.rows;
    },
    async updateReview(id,{stage}){
      const result=await db.query(
        `UPDATE private_deal_opportunities SET stage=$2,updated_at=now()
         WHERE id=$1 AND confidentiality='restricted'
         RETURNING id,parent_system,opportunity_name,asset_category,source_project,stage,
           confidentiality,verification_status,offering_status,owner_review_status,evidence_manifest_ref`,
        [validId(id),stage]);
      if(!result.rows[0])throw new Error('opportunity_not_found');
      return result.rows[0];
    }
  };
  // Deliberate fail-closed placeholder. Durable audit needs a separately
  // migrated append-only audit table; don't substitute console logs or memory.
  const audit={async append(){throw new Error('durable_audit_store_not_configured')}};
  return {storage,audit};
}
