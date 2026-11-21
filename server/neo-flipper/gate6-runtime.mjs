/** Gate 6 assembly: refuses privileged DB identities and absent independent verifiers. */
import {createGate6NeopassVerifier} from './gate6-neopass-verifier.mjs';
import {createGate5PostgresStore} from './gate5-postgres-store.mjs';
import {createFlipperGate5,createFlipperGate5HttpHandler} from './gate5-service.mjs';

export const GATE6_DB_ROLE='neo_flipper_staging_app';
function reject(msg){throw Object.assign(new Error(msg),{code:msg})}

/** Caller supplies authenticated, live read-only identity/attestation providers, never dummy defaults. */
export async function createGate6Runtime({
 pool,issuerSecret,getCurrentAccess,isRevoked,verifyBuyer,verifyListing,verifyValuation,matchBuyer,
 clock=()=>Date.now(),expectedRole=GATE6_DB_ROLE,
}={}){
 if(!pool||typeof pool.connect!=='function'||typeof pool.query!=='function')reject('postgres_pool_required');
 if(expectedRole!==GATE6_DB_ROLE)reject('restricted_role_required');
 if([getCurrentAccess,isRevoked,verifyBuyer,verifyListing,verifyValuation,matchBuyer].some(fn=>typeof fn!=='function'))
  reject('trusted_provider_callbacks_required');
 // Preflight on exactly the same authenticated connection pool used by the store.
 // A database owner or shared admin credential may never serve this module.
 let row;
 try{
  const result=await pool.query('SELECT current_user AS role_name,current_database() AS database_name');
  row=result?.rows?.[0];
 }catch{reject('database_role_preflight_unavailable')}
 if(row?.role_name!==GATE6_DB_ROLE||row?.database_name!=='neo_deal_desk_staging')
  reject('database_identity_not_restricted_staging');
 const policy=await pool.query(
  "SELECT has_schema_privilege(current_user,'neo_flipper','USAGE') AS permitted,"+
  "has_table_privilege(current_user,'neo_flipper.buyers','SELECT') AS buyer_read,"+
  "has_table_privilege(current_user,'public.private_deal_opportunities','SELECT') AS unrelated_read");
 const p=policy?.rows?.[0];
 if(p?.permitted!==true||p?.buyer_read!==true||p?.unrelated_read!==false)
  reject('database_privilege_boundary_failed');
 const verifyToken=createGate6NeopassVerifier({secret:issuerSecret,getCurrentAccess,isRevoked,clock});
 const store=createGate5PostgresStore(pool);
 const service=createFlipperGate5({store,verifyToken,verifyBuyer,verifyListing,verifyValuation,matchBuyer,clock});
 return Object.freeze({service,handler:createFlipperGate5HttpHandler(service),mode:'staging_only',databaseRole:GATE6_DB_ROLE});
}
