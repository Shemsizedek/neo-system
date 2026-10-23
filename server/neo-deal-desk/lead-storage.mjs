export const leadSchema = `
CREATE TABLE IF NOT EXISTS neo_sales_leads (
 id uuid PRIMARY KEY, dedupe_key char(64) NOT NULL UNIQUE,
 organization text NOT NULL, email text NOT NULL, project text NOT NULL,
 service text NOT NULL, budget text NOT NULL, timeline text NOT NULL,
 consent boolean NOT NULL CHECK (consent),
 status text NOT NULL DEFAULT 'received_unqualified',
 source text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS neo_sales_leads_created_idx ON neo_sales_leads (created_at DESC);
`;
export function postgresLeadStore(pool){
 if(typeof pool?.query!=='function')throw new TypeError('postgres_pool_required');
 return {
  async insertIfAbsent(key,lead){
   if(!/^[a-f0-9]{64}$/.test(key))throw new Error('invalid_dedupe_key');
   const fields=[lead.id,key,lead.organization,lead.email,lead.project,lead.service,lead.budget,lead.timeline,lead.consent,lead.status,lead.source];
   const q=`INSERT INTO neo_sales_leads (id,dedupe_key,organization,email,project,service,budget,timeline,consent,status,source)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
ON CONFLICT (dedupe_key) DO UPDATE SET dedupe_key=EXCLUDED.dedupe_key RETURNING id`;
   const result=await pool.query(q,fields);return {id:String(result.rows[0].id)};
  },
  async listMetadata(limit=25){
   const n=Number.isInteger(limit)?Math.min(Math.max(limit,1),50):25;
   const result=await pool.query('SELECT id,organization,service,budget,timeline,status,created_at FROM neo_sales_leads ORDER BY created_at DESC LIMIT $1',[n]);
   return result.rows;
  }
 };
}
export async function operatorLeadView(req,res,{store,identity}={}){
 const reply=(status,body)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(body));};
 // Identity MUST come from verified OIDC middleware, not from request-supplied headers.
 if(!identity?.verified||!identity.roles?.includes('neo_sales_operator'))return reply(403,{error:'operator_access_required'});
 if(!store?.listMetadata)return reply(503,{error:'store_unavailable'});
 try{return reply(200,{leads:await store.listMetadata()});}catch{return reply(503,{error:'store_unavailable'});}
}
