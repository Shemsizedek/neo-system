import test from 'node:test';
import assert from 'node:assert/strict';
import {createGate5PostgresStore} from './gate5-postgres-store.mjs';

const buyer={buyerId:'B-TEST08',identityRef:'ref:id',consentRef:'ref:consent',
 consentAt:'2026-11-21T08:00:00Z',fundsRef:'ref:funds',fundsVerifiedAt:'2026-11-21T08:00:00Z',
 maxAllInUsd:200000,markets:['Houston'],assetTypes:['single_family']};
function fakePool({replay=null,eligibleBuyers=1,listingValid=true,previewError=false}={}) {
 const calls=[];
 const client={
  async query(sql,args=[]){
   calls.push({sql,args});
   if(sql==='BEGIN'||sql==='COMMIT'||sql==='ROLLBACK')return {rowCount:0,rows:[]};
   if(sql.includes('INSERT INTO neo_flipper.audit_events'))return {rowCount:replay?0:1,rows:replay?[]:[{request_key:args[0]}]};
   if(sql.includes('SELECT payload_hash,actor_subject'))return {rowCount:replay?1:0,rows:replay?[replay]:[]};
   if(sql.includes('SELECT listing_id FROM neo_flipper.listings'))return {rowCount:listingValid?1:0,rows:listingValid?[{listing_id:'LIST-TEST08'}]:[]};
   if(sql.includes('SELECT buyer_id FROM neo_flipper.buyers'))return {rowCount:eligibleBuyers,rows:Array.from({length:eligibleBuyers},(_,i)=>({buyer_id:'B-'+i}))};
   if(sql.includes('INSERT INTO neo_flipper.deal_previews')) {
    if(previewError)throw Error('provider_database_failure');
    return {rowCount:1,rows:[]}
   }
   if(sql.includes('INSERT INTO neo_flipper.buyers'))return {rowCount:1,rows:[{buyer_id:'B-TEST08'}]};
   if(sql.includes('UPDATE neo_flipper.buyers'))return {rowCount:1,rows:[{buyer_id:'B-TEST08'}]};
   throw new Error('unexpected_query:'+sql);
  },
  release(){calls.push({sql:'RELEASE'})}
 };
 return {calls,async connect(){return client},async query(){return {rows:[]}}};
}
const preview={listingId:'LIST-TEST08',matches:[{buyerId:'B-TEST08',
 maximumSellerContractPriceUsd:150000,potentialNetAssignmentFeeUsd:8500}],
 valuationEvidenceRef:'ref:valuation',sourceEvidenceRef:'ref:status'};
test('fresh buyer write uses transactional audit and releases',async()=>{
 const pool=fakePool(),store=createGate5PostgresStore(pool);
 const result=await store.saveBuyer(buyer,'neopass:test','request-0001','a'.repeat(64));
 assert.equal(result.stored,true);
 assert.ok(pool.calls.some(x=>x.sql==='COMMIT'));
 assert.ok(!pool.calls.some(x=>x.sql==='ROLLBACK'));
 assert.ok(pool.calls.some(x=>x.sql==='RELEASE'));
});
test('idempotent replay with matching context commits and does not repeat writes',async()=>{
 const replay={payload_hash:'a'.repeat(64),actor_subject:'neopass:test',operation:'buyer_upsert',entity_id:'B-TEST08'};
 const pool=fakePool({replay}),store=createGate5PostgresStore(pool);
 const result=await store.saveBuyer(buyer,'neopass:test','request-0001','a'.repeat(64));
 assert.equal(result.idempotent,true);
 assert.equal(pool.calls.some(x=>x.sql.includes('INSERT INTO neo_flipper.buyers')),false);
});
test('idempotent replay with different actor is rejected and rolls back',async()=>{
 const replay={payload_hash:'a'.repeat(64),actor_subject:'neopass:another',operation:'buyer_upsert',entity_id:'B-TEST08'};
 const pool=fakePool({replay}),store=createGate5PostgresStore(pool);
 await assert.rejects(store.saveBuyer(buyer,'neopass:test','request-0001','a'.repeat(64)),/idempotency_conflict/);
 assert.ok(pool.calls.some(x=>x.sql==='ROLLBACK'));
});
test('idempotent replay with different operation or entity is rejected',async()=>{
 const replay={payload_hash:'a'.repeat(64),actor_subject:'neopass:test',operation:'listing_upsert',entity_id:'LIST-OTHER'};
 const pool=fakePool({replay}),store=createGate5PostgresStore(pool);
 await assert.rejects(store.saveBuyer(buyer,'neopass:test','request-0001','a'.repeat(64)),/idempotency_conflict/);
});
test('preview locks listing and eligible buyer rows before insert',async()=>{
 const pool=fakePool(),store=createGate5PostgresStore(pool);
 const result=await store.savePreview(preview,'neopass:test','request-0002','b'.repeat(64));
 assert.equal(result.idempotent,false);
 const queries=pool.calls.map(x=>x.sql);
 const first=queries.findIndex(x=>x.includes('SELECT listing_id FROM neo_flipper.listings'));
 const second=queries.findIndex(x=>x.includes('SELECT buyer_id FROM neo_flipper.buyers'));
 const insert=queries.findIndex(x=>x.includes('INSERT INTO neo_flipper.deal_previews'));
 assert.ok(first>=0&&second>first&&insert>second);
 assert.ok(queries[first].includes('FOR SHARE'));
 assert.ok(queries[second].includes('FOR SHARE'));
});
test('buyer withdrawn between matching and commit makes preview fail closed',async()=>{
 const pool=fakePool({eligibleBuyers:0}),store=createGate5PostgresStore(pool);
 await assert.rejects(store.savePreview(preview,'neopass:test','request-0002','b'.repeat(64)),/buyer_consent_or_funds_revoked/);
 assert.ok(pool.calls.some(x=>x.sql==='ROLLBACK'));
 assert.equal(pool.calls.some(x=>x.sql.includes('INSERT INTO neo_flipper.deal_previews')),false);
});
test('listing expired between matching and commit makes preview fail closed',async()=>{
 const pool=fakePool({listingValid:false}),store=createGate5PostgresStore(pool);
 await assert.rejects(store.savePreview(preview,'neopass:test','request-0002','b'.repeat(64)),/listing_status_expired/);
 assert.equal(pool.calls.some(x=>x.sql.includes('INSERT INTO neo_flipper.deal_previews')),false);
});
test('insert failure rolls back audit transaction',async()=>{
 const pool=fakePool({previewError:true}),store=createGate5PostgresStore(pool);
 await assert.rejects(store.savePreview(preview,'neopass:test','request-0002','b'.repeat(64)),/provider_database_failure/);
 assert.ok(pool.calls.some(x=>x.sql==='ROLLBACK'));
});
test('duplicate buyer refs cannot enter preview',async()=>{
 const pool=fakePool(),store=createGate5PostgresStore(pool);
 await assert.rejects(store.savePreview({...preview,matches:[preview.matches[0],preview.matches[0]]},'neopass:test','request-0002','b'.repeat(64)),/preview_buyer_ids_invalid/);
 assert.equal(pool.calls.some(x=>x.sql.includes('INSERT INTO neo_flipper.deal_previews')),false);
});
