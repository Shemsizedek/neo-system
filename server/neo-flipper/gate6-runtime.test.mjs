import test from 'node:test';
import assert from 'node:assert/strict';
import {createGate6Runtime} from './gate6-runtime.mjs';

const SECRET='neo-flipper-unit-test-hs256-secret-at-least-32-bytes';
const trusted={
 issuerSecret:SECRET,
 getCurrentAccess:async()=>({active:true,scopes:['buyer:read']}),
 isRevoked:async()=>false,
 verifyBuyer:async()=>true,
 verifyListing:async()=>true,
 verifyValuation:async()=>true,
 matchBuyer:async()=>({status:'research_only'})
};
const pool=(role='neo_flipper_staging_app',unrelatedRead=false)=>({
 async connect(){return {query:async()=>({rows:[],rowCount:0}),release:()=>{}}},
 async query(sql){
  if(sql.startsWith('SELECT current_user'))return {rows:[{role_name:role,database_name:'neo_deal_desk_staging'}]};
  if(sql.includes('has_schema_privilege'))return {rows:[{permitted:true,buyer_read:true,unrelated_read:unrelatedRead}]};
  return {rows:[]};
 }
});
test('rejects missing provider access and no database',async()=>{
 await assert.rejects(createGate6Runtime({...trusted,pool:undefined}),/postgres_pool_required/);
 await assert.rejects(createGate6Runtime({pool:pool(),issuerSecret:SECRET}),/trusted_provider_callbacks_required/);
});
test('does not permit owner or admin database role',async()=>{
 await assert.rejects(createGate6Runtime({...trusted,pool:pool('neo_deal_desk_staging_owner')}),/database_identity_not_restricted_staging/);
});
test('does not permit access to unrelated private Deal Desk data',async()=>{
 await assert.rejects(createGate6Runtime({...trusted,pool:pool(undefined,true)}),/database_privilege_boundary_failed/);
});
test('cannot override the allowed staging database role',async()=>{
 await assert.rejects(createGate6Runtime({...trusted,pool:pool(),expectedRole:'admin'}),/restricted_role_required/);
});
test('refuses absent issuer secret',async()=>{
 await assert.rejects(createGate6Runtime({...trusted,pool:pool(),issuerSecret:''}),/staging_issuer_secret_required/);
});
test('allows assembly only with restricted role and mandatory providers',async()=>{
 const r=await createGate6Runtime({...trusted,pool:pool()});
 assert.equal(r.mode,'staging_only');
 assert.equal(r.databaseRole,'neo_flipper_staging_app');
 assert.equal(typeof r.handler,'function');
 assert.equal(typeof r.service.buyers,'function');
});
test('fails closed when database privilege preflight fails',async()=>{
 const bad={...pool(),query:async()=>{throw Error('DB unavailable')}};
 await assert.rejects(createGate6Runtime({...trusted,pool:bad}),/database_role_preflight_unavailable/);
});
