import test from 'node:test';
import assert from 'node:assert/strict';
import {createGate9ScratchRuntime,GATE9_SCRATCH} from './gate9-scratch-runtime.mjs';

const SECRET='gate-nine-test-secret-at-least-thirty-two-bytes';
const dbPool=(overrides={})=>({
 async query(sql){
  if(sql.startsWith('SELECT current_user'))return {rows:[{role_name:'neo_flipper_gate9_app',database_name:'neo_deal_desk_staging'}]};
  if(sql.includes('has_schema_privilege'))return {rows:[{schema_ok:true,buyer_permissions:true,buyer_delete:false,audit_delete:false,private_deal_read:false}]};
  return {rows:[]};
 },
 async connect(){return {query:async()=>({rows:[],rowCount:0}),release(){}}},
 ...overrides
});
const opts=(overrides={})=>({
 pool:dbPool(),issuerSecret:SECRET,
 getCurrentAccess:async()=>({active:true,scopes:['buyer:read']}),
 isRevoked:async()=>false,
 verifyBuyer:async()=>true,
 verifyListing:async()=>true,
 verifyValuation:async()=>true,
 matchBuyer:async()=>({status:'research_only'}),
 verifyScratchBranch:async meta=>meta.branchId==='br-holy-lab-ar0at3wz',
 ...overrides
});
test('binds runtime to exact scratch branch metadata',()=>{
 assert.equal(GATE9_SCRATCH.branchId,'br-holy-lab-ar0at3wz');
 assert.equal(GATE9_SCRATCH.database,'neo_deal_desk_staging');
});
test('refuses any missing trusted provider',async()=>{
 await assert.rejects(createGate9ScratchRuntime(opts({verifyScratchBranch:null})),/trusted_scratch_providers_missing/);
});
test('rejects branch attestation failure',async()=>{
 await assert.rejects(createGate9ScratchRuntime(opts({verifyScratchBranch:async()=>false})),/scratch_branch_not_verified/);
});
test('rejects wrong DB login role even with otherwise valid permissions',async()=>{
 const pool=dbPool({async query(sql){
  if(sql.startsWith('SELECT current_user'))return {rows:[{role_name:'neo_deal_desk_staging_owner',database_name:'neo_deal_desk_staging'}]};
  return {rows:[{schema_ok:true,buyer_permissions:true,buyer_delete:false,audit_delete:false,private_deal_read:false}]};
 }});
 await assert.rejects(createGate9ScratchRuntime(opts({pool})),/unexpected_database_identity/);
});
test('rejects unintended permission to delete records',async()=>{
 const pool=dbPool({async query(sql){
  if(sql.startsWith('SELECT current_user'))return {rows:[{role_name:'neo_flipper_gate9_app',database_name:'neo_deal_desk_staging'}]};
  return {rows:[{schema_ok:true,buyer_permissions:true,buyer_delete:true,audit_delete:false,private_deal_read:false}]};
 }});
 await assert.rejects(createGate9ScratchRuntime(opts({pool})),/scratch_role_privileges_invalid/);
});
test('rejects private Deal Desk access',async()=>{
 const pool=dbPool({async query(sql){
  if(sql.startsWith('SELECT current_user'))return {rows:[{role_name:'neo_flipper_gate9_app',database_name:'neo_deal_desk_staging'}]};
  return {rows:[{schema_ok:true,buyer_permissions:true,buyer_delete:false,audit_delete:false,private_deal_read:true}]};
 }});
 await assert.rejects(createGate9ScratchRuntime(opts({pool})),/scratch_role_privileges_invalid/);
});
test('accepts read-only assembly with restricted identity but does not deploy',async()=>{
 const r=await createGate9ScratchRuntime(opts());
 assert.equal(r.mode,'synthetic_scratch_only');
 assert.equal(typeof r.handler,'function');
});
test('rejects non-synthetic buyer and listing at boundary',async()=>{
 const r=await createGate9ScratchRuntime(opts());
 assert.throws(()=>r.service.saveBuyer('fake',{buyerId:'B-REAL987',identityRef:'vault:real',fundsRef:'fixture:funds',consentRef:'fixture:consent'},'requestkey-009'),/only_synthetic_buyer_records_allowed/);
 assert.throws(()=>r.service.importListing('fake',{id:'LIST-GATE9GOOD',statusEvidenceRef:'fixture:status',sourceGrantRef:'fixture:license',sourceUrl:'https://example.com/actual-property'},'requestkey-010'),/only_synthetic_listings_allowed/);
});
test('suppress and preview require synthetic IDs',async()=>{
 const r=await createGate9ScratchRuntime(opts());
 assert.throws(()=>r.service.suppress('fake','B-ACTUAL988','requestkey-011'),/only_synthetic_buyer_ids_allowed/);
 assert.throws(()=>r.service.preview('fake',{listingId:'LIST-OTHER987',valuationEvidenceRef:'fixture:comps'},'requestkey-012'),/only_synthetic_previews_allowed/);
});
