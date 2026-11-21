/** Gate 5 Postgres adapter: inject least-privileged pool, never auto-migrate. */
import {createHash} from 'node:crypto';
const fail=(s,status=409)=>{throw Object.assign(new Error(s),{code:s,status})};
const hashed=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const iso=d=>new Date(d).toISOString();
const buyer=r=>({buyerId:r.buyer_id,identityRef:r.identity_ref,consentRef:r.consent_ref,consentAt:iso(r.consent_at),fundsRef:r.funds_ref,
 fundsVerifiedAt:iso(r.funds_verified_at),maxAllInUsd:Number(r.max_all_in_usd),markets:r.markets,assetTypes:r.asset_types});
const listing=r=>({id:r.listing_id,address:r.address,market:r.market,assetType:r.asset_type,jurisdiction:r.jurisdiction,
 sourceUrl:r.source_url,sourceType:r.source_type,providerId:r.provider_id,sourceGrantRef:r.source_grant_ref,
 status:r.listing_status,statusEvidenceRef:r.status_evidence_ref,statusVerifiedAt:iso(r.status_verified_at),
 daysOnMarket:r.days_on_market,listPriceUsd:Number(r.list_price_usd)});
export function createGate5PostgresStore(pool){
 if(!pool||typeof pool.connect!=='function'||typeof pool.query!=='function')fail('postgres_pool_required',503);
 async function write(op,id,actor,key,digest,callback){
  const c=await pool.connect();let active=false;
  try{
   await c.query('BEGIN');active=true;
   const i=await c.query('INSERT INTO neo_flipper.audit_events(request_key,payload_hash,actor_subject,operation,entity_id) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING RETURNING request_key',[key,digest,actor,op,id]);
   if(!i.rowCount){
    const r=await c.query('SELECT payload_hash,actor_subject,operation,entity_id FROM neo_flipper.audit_events WHERE request_key=$1',[key]);
    const prior=r.rows[0];
    if(!prior||prior.payload_hash!==digest||prior.actor_subject!==actor||prior.operation!==op||prior.entity_id!==id)fail('idempotency_conflict');
    await c.query('COMMIT');active=false;return {idempotent:true,entityId:id}
   }
   const result=await callback(c);await c.query('COMMIT');active=false;return result;
  }catch(e){if(active)await c.query('ROLLBACK');throw e}finally{c.release()}
 }
 return Object.freeze({
  async saveBuyer(b,actor,key,digest){return write('buyer_upsert',b.buyerId,actor,key,digest,async c=>{
   const r=await c.query(
    'INSERT INTO neo_flipper.buyers(buyer_id,identity_ref,consent_ref,consent_at,funds_ref,funds_verified_at,max_all_in_usd,markets,asset_types) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb) '+
    'ON CONFLICT(buyer_id) DO UPDATE SET identity_ref=EXCLUDED.identity_ref,consent_ref=EXCLUDED.consent_ref,consent_at=EXCLUDED.consent_at,funds_ref=EXCLUDED.funds_ref,funds_verified_at=EXCLUDED.funds_verified_at,max_all_in_usd=EXCLUDED.max_all_in_usd,markets=EXCLUDED.markets,asset_types=EXCLUDED.asset_types,suppressed_at=NULL,revision=neo_flipper.buyers.revision+1,updated_at=now() '+
    'WHERE EXCLUDED.consent_at>=neo_flipper.buyers.consent_at AND (neo_flipper.buyers.suppressed_at IS NULL OR EXCLUDED.consent_at>neo_flipper.buyers.suppressed_at) RETURNING buyer_id',
    [b.buyerId,b.identityRef,b.consentRef,b.consentAt,b.fundsRef,b.fundsVerifiedAt,b.maxAllInUsd,JSON.stringify(b.markets),JSON.stringify(b.assetTypes)]);
   if(r.rowCount!==1)fail('new_consent_or_fresh_evidence_required');
   return {buyerId:b.buyerId,stored:true,personalDataStored:false,idempotent:false};
  })},
  async suppressBuyer(id,actor,key){return write('buyer_suppress',id,actor,key,hashed({id,operation:'suppress'}),async c=>{
   const r=await c.query('UPDATE neo_flipper.buyers SET suppressed_at=now(),revision=revision+1,updated_at=now() WHERE buyer_id=$1 RETURNING buyer_id',[id]);
   if(r.rowCount!==1)fail('buyer_not_found',404);return {buyerId:id,suppressed:true,idempotent:false};
  })},
  async listBuyers(timestamp){
   const r=await pool.query('SELECT * FROM neo_flipper.buyers WHERE suppressed_at IS NULL AND consent_at BETWEEN to_timestamp($1/1000.0)-interval \'365 days\' AND to_timestamp($1/1000.0) AND funds_verified_at BETWEEN to_timestamp($1/1000.0)-interval \'90 days\' AND to_timestamp($1/1000.0)',[timestamp]);
   return r.rows.map(buyer);
  },
  async saveListing(l,actor,key,digest){return write('listing_upsert',l.id,actor,key,digest,async c=>{
   const r=await c.query(
    'INSERT INTO neo_flipper.listings(listing_id,address,market,asset_type,jurisdiction,source_url,source_type,provider_id,source_grant_ref,status_evidence_ref,status_verified_at,list_price_usd,days_on_market,listing_status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) '+
    'ON CONFLICT(listing_id) DO UPDATE SET address=EXCLUDED.address,market=EXCLUDED.market,asset_type=EXCLUDED.asset_type,source_url=EXCLUDED.source_url,source_type=EXCLUDED.source_type,provider_id=EXCLUDED.provider_id,source_grant_ref=EXCLUDED.source_grant_ref,status_evidence_ref=EXCLUDED.status_evidence_ref,status_verified_at=EXCLUDED.status_verified_at,list_price_usd=EXCLUDED.list_price_usd,days_on_market=EXCLUDED.days_on_market,listing_status=EXCLUDED.listing_status,revision=neo_flipper.listings.revision+1,updated_at=now() WHERE EXCLUDED.status_verified_at>=neo_flipper.listings.status_verified_at RETURNING listing_id',
    [l.id,l.address,l.market,l.assetType,l.jurisdiction,l.sourceUrl,l.sourceType,l.providerId,l.sourceGrantRef,l.statusEvidenceRef,l.statusVerifiedAt,l.listPriceUsd,l.daysOnMarket,l.status]);
   if(r.rowCount!==1)fail('stale_listing_update');return {listingId:l.id,stored:true,idempotent:false};
  })},
  async getListing(id){const r=await pool.query('SELECT * FROM neo_flipper.listings WHERE listing_id=$1',[id]);return r.rows[0]?listing(r.rows[0]):null},
  async listListings(){const r=await pool.query('SELECT * FROM neo_flipper.listings ORDER BY status_verified_at DESC LIMIT 100');return r.rows.map(listing)},
  async savePreview(p,actor,key,digest){return write('preview_record',p.listingId,actor,key,digest,async c=>{
   // Hold a SHARE lock on the listing and all matched buyers until the preview commits.
   // Concurrent opt-out UPDATEs and listing status refreshes cannot race the persisted match.
   if(!Array.isArray(p.matches)||p.matches.length>100)fail('preview_matches_invalid');
   const ids=p.matches.map(m=>m?.buyerId);
   if(ids.some(x=>typeof x!=='string'||!/^B-[A-Za-z0-9_-]{3,64}$/.test(x))||new Set(ids).size!==ids.length)fail('preview_buyer_ids_invalid');
   const listingCheck=await c.query(
    "SELECT listing_id FROM neo_flipper.listings WHERE listing_id=$1 AND listing_status IN ('active','for_sale') AND status_verified_at BETWEEN now()-interval '72 hours' AND now() FOR SHARE",
    [p.listingId]);
   if(listingCheck.rowCount!==1)fail('listing_status_expired');
   if(ids.length){
    const matched=await c.query(
     "SELECT buyer_id FROM neo_flipper.buyers WHERE buyer_id=ANY($1::text[]) AND suppressed_at IS NULL AND consent_at BETWEEN now()-interval '365 days' AND now() AND funds_verified_at BETWEEN now()-interval '90 days' AND now() FOR SHARE",
     [ids]);
    if(matched.rowCount!==ids.length)fail('buyer_consent_or_funds_revoked');
   }
   await c.query('INSERT INTO neo_flipper.deal_previews(request_key,listing_id,buyer_matches,valuation_evidence_ref,status_evidence_ref) VALUES($1,$2,$3::jsonb,$4,$5)',[key,p.listingId,JSON.stringify(p.matches),p.valuationEvidenceRef,p.sourceEvidenceRef]);
   return {...p,idempotent:false};
  })},
  async audit(){const r=await pool.query('SELECT operation,entity_id,actor_subject,created_at,request_key FROM neo_flipper.audit_events ORDER BY created_at DESC LIMIT 200');
   return r.rows.map(x=>({operation:x.operation,entityId:x.entity_id,actor:x.actor_subject,at:x.created_at,requestKey:x.request_key}))}
 });
}
