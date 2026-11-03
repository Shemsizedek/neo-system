// Database connectivity is private and must not expose query results,
// credentials, account records or token content to unauthenticated callers.
export async function createNeonStagingClient({databaseUrl=process.env.NEOFX_DATABASE_URL,PoolCtor}={}){
 if(typeof databaseUrl!=='string'||!databaseUrl.startsWith('postgresql://'))throw Error('neon_connection_not_configured');
 const url=new URL(databaseUrl);
 if(!url.hostname.endsWith('.neon.tech'))throw Error('untrusted_database_host');
 if(url.searchParams.get('sslmode')!=='require')url.searchParams.set('sslmode','require');
 const Pool=PoolCtor||(await import('pg')).Pool;
 const pool=new Pool({connectionString:url.toString(),max:3,connectionTimeoutMillis:5000,idleTimeoutMillis:15000});
 return {
   async query(text,values=[]){
     if(typeof text!=='string'||!Array.isArray(values))throw Error('invalid_db_query');
     return pool.query(text,values);
   },
   async checkSchema(){
     const r=await pool.query("SELECT to_regclass('neofx_auth.oauth_state') AS oauth_state, to_regclass('neofx_auth.broker_tokens') AS broker_tokens");
     return Boolean(r.rows?.[0]?.oauth_state&&r.rows?.[0]?.broker_tokens);
   },
   async close(){await pool.end();}
 };
}
