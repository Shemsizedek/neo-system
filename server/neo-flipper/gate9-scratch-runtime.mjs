/** NEO-FLIP-009 isolated scratch harness. Never use with production records.
 * Every mutation is limited to explicit GATE9 synthetic IDs and a pinned scratch branch.
 */
import {createGate6NeopassVerifier} from './gate6-neopass-verifier.mjs';
import {createGate5PostgresStore} from './gate5-postgres-store.mjs';
import {createFlipperGate5,createFlipperGate5HttpHandler} from './gate5-service.mjs';
export const GATE9_SCRATCH = Object.freeze({
 projectId:'mute-rice-57396659',
 branchId:'br-holy-lab-ar0at3wz',
 database:'neo_deal_desk_staging',
 role:'neo_flipper_gate9_app'
});
const error=code=>{throw Object.assign(new Error(code),{code,status:403})};
const buyerId=/^B-GATE9[A-Za-z0-9_-]{3,64}$/;
const listingId=/^LIST-GATE9[A-Za-z0-9_-]{3,64}$/;

/** The branch attestor MUST read trusted provider metadata, not a request header or JWT claim. */
export async function createGate9ScratchRuntime({
 pool,issuerSecret,getCurrentAccess,isRevoked,verifyBuyer,verifyListing,verifyValuation,
 matchBuyer,verifyScratchBranch,clock=()=>Date.now()
}={}){
 if(!pool||typeof pool.query!=='function'||typeof pool.connect!=='function')error('restricted_pg_pool_missing');
 if([getCurrentAccess,isRevoked,verifyBuyer,verifyListing,verifyValuation,matchBuyer,verifyScratchBranch].some(f=>typeof f!=='function'))
  error('trusted_scratch_providers_missing');
 // The external attestor must bind the database connection configuration to the exact scratch branch.
 if(await verifyScratchBranch({...GATE9_SCRATCH})!==true)error('scratch_branch_not_verified');
 let identity,policy;
 try{
  identity=(await pool.query('SELECT current_user AS role_name,current_database() AS database_name')).rows?.[0];
  policy=(await pool.query(
   "SELECT has_schema_privilege(current_user,'neo_flipper','USAGE') AS schema_ok,"+
   "has_table_privilege(current_user,'neo_flipper.buyers','SELECT,INSERT,UPDATE') AS buyer_permissions,"+
   "has_table_privilege(current_user,'neo_flipper.buyers','DELETE') AS buyer_delete,"+
   "has_table_privilege(current_user,'neo_flipper.audit_events','DELETE') AS audit_delete,"+
   "has_table_privilege(current_user,'public.private_deal_opportunities','SELECT') AS private_deal_read")).rows?.[0];
 }catch{error('scratch_database_preflight_failed')}
 if(identity?.role_name!==GATE9_SCRATCH.role||identity?.database_name!==GATE9_SCRATCH.database)
  error('unexpected_database_identity');
 if(policy?.schema_ok!==true||policy?.buyer_permissions!==true||policy?.buyer_delete!==false||
  policy?.audit_delete!==false||policy?.private_deal_read!==false)
  error('scratch_role_privileges_invalid');
 const verifyToken=createGate6NeopassVerifier({secret:issuerSecret,getCurrentAccess,isRevoked,clock});
 const base=createFlipperGate5({store:createGate5PostgresStore(pool),verifyToken,verifyBuyer,verifyListing,
  verifyValuation,matchBuyer,clock});
 const service=Object.freeze({
  buyers:token=>base.buyers(token),
  listings:token=>base.listings(token),
  audit:token=>base.audit(token),
  saveBuyer:(token,record,key)=>{
   if(!buyerId.test(record?.buyerId||'')||!String(record.identityRef||'').startsWith('fixture:')||
    !String(record.fundsRef||'').startsWith('fixture:')||
    !String(record.consentRef||'').startsWith('fixture:'))error('only_synthetic_buyer_records_allowed');
   return base.saveBuyer(token,record,key);
  },
  importListing:(token,record,key)=>{
   if(!listingId.test(record?.id||'')||!String(record.statusEvidenceRef||'').startsWith('fixture:')||
    !String(record.sourceGrantRef||'').startsWith('fixture:')||
    !String(record.sourceUrl||'').startsWith('https://example.org/'))error('only_synthetic_listings_allowed');
   return base.importListing(token,record,key);
  },
  suppress:(token,id,key)=>{
   if(!buyerId.test(id||''))error('only_synthetic_buyer_ids_allowed');
   return base.suppress(token,id,key);
  },
  preview:(token,record,key)=>{
   if(!listingId.test(record?.listingId||'')||!String(record.valuationEvidenceRef||'').startsWith('fixture:'))
    error('only_synthetic_previews_allowed');
   return base.preview(token,record,key);
  }
 });
 return Object.freeze({mode:'synthetic_scratch_only',branch:GATE9_SCRATCH.branchId,
  service,handler:createFlipperGate5HttpHandler(service)});
}
