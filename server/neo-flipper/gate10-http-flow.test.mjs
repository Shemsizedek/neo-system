import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {createHash,createHmac} from 'node:crypto';
import {createGate6NeopassVerifier} from './gate6-neopass-verifier.mjs';
import {createFlipperGate5,createFlipperGate5HttpHandler} from './gate5-service.mjs';

/** Entire HTTP flow is loopback-only. Store, signing, and provider proofs are synthetic.
 * It is NOT a real Neon/NEOpass integration test or a production issuer.
 */
test('Gate 10: signed JWT through loopback HTTP to synthetic transaction persistence', async t=>{
 const secret='gate10-test-only-key-with-at-least-32-characters';
 const now=()=>Date.now();
 let revoked=false,matchOutage=false;
 const buyers=new Map(),listings=new Map(),previews=new Map(),audits=new Map();
 function replay(op,id,actor,key,hash){
  const r=audits.get(key);
  if(r){
   if(r.op!==op||r.id!==id||r.actor!==actor||r.hash!==hash)
    throw Object.assign(new Error('idempotency_conflict'),{code:'idempotency_conflict',status:409});
   return true;
  }
  audits.set(key,{op,id,actor,hash});
  return false;
 }
 const fresh=x=>Date.parse(x)<=now()&&Date.parse(x)>=now()-90*86400000;
 const store={
  async saveBuyer(b,actor,key,hash){
   if(replay('buyer_upsert',b.buyerId,actor,key,hash))return {idempotent:true,entityId:b.buyerId};
   buyers.set(b.buyerId,structuredClone(b));return {stored:true,buyerId:b.buyerId,idempotent:false};
  },
  async suppressBuyer(id,actor,key){
   if(replay('buyer_suppress',id,actor,key,createHash('sha256').update(JSON.stringify({id,operation:'suppress'})).digest('hex')))
    return {idempotent:true,entityId:id};
   const b=buyers.get(id);
   if(!b)throw Object.assign(new Error('buyer_not_found'),{code:'buyer_not_found',status:404});
   b.suppressed=true;return {buyerId:id,suppressed:true,idempotent:false};
  },
  async saveListing(l,actor,key,hash){
   if(replay('listing_upsert',l.id,actor,key,hash))return {idempotent:true,entityId:l.id};
   listings.set(l.id,structuredClone(l));return {stored:true,listingId:l.id,idempotent:false};
  },
  async listBuyers(){return [...buyers.values()].filter(b=>!b.suppressed&&fresh(b.fundsVerifiedAt)&&fresh(b.consentAt))},
  async listListings(){return [...listings.values()]},
  async getListing(id){return listings.get(id)||null},
  async savePreview(p,actor,key,hash){
   if(replay('preview_record',p.listingId,actor,key,hash))return {idempotent:true,entityId:p.listingId};
   if(p.matches.some(m=>buyers.get(m.buyerId)?.suppressed))
    throw Object.assign(new Error('buyer_consent_or_funds_revoked'),{code:'buyer_consent_or_funds_revoked',status:409});
   previews.set(key,structuredClone(p));return {...p,idempotent:false};
  },
  async audit(){return [...audits.entries()].map(([key,a])=>({key,operation:a.op,entityId:a.id,actor:a.actor}))}
 };
 const verifyToken=createGate6NeopassVerifier({
  secret,clock:now,isRevoked:async()=>revoked,
  getCurrentAccess:async()=>({active:true,scopes:['buyer:read','buyer:write','listing:read','listing:write','deal:read','audit:read']})
 });
 const service=createFlipperGate5({
  store,verifyToken,clock:now,verifyBuyer:async b=>b.identityRef.startsWith('fixture:')&&b.fundsRef.startsWith('fixture:'),
  verifyListing:async l=>l.providerId==='gate10-synthetic'&&l.sourceGrantRef.startsWith('fixture:'),
  verifyValuation:async x=>x.valuationEvidenceRef==='fixture:valuation-gate10',
  matchBuyer:async ({buyer,listing})=>{
   if(matchOutage)throw new Error('synthetic_matcher_offline');
   if(!buyer.markets.includes(listing.market))return {status:'not_a_match'};
   return {status:'indicative_buyer_first_ceiling',maximumSellerContractPriceUsd:145000,estimatedNetAssignmentFeeUsd:8500};
  }
 });
 const server=createServer(createFlipperGate5HttpHandler(service));
 server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(async()=>{await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()))});
 const base='http://127.0.0.1:'+server.address().port;
 function signedToken(scopes=['buyer:read','buyer:write','listing:read','listing:write','deal:read','audit:read'],override={}){
  const payload={iss:'neo-pass',aud:'neo-flipper-staging',active:true,
   sub:'neopass:gate10-synthetic',jti:'gate10-jti',iat:Math.floor(now()/1000)-5,
   exp:Math.floor(now()/1000)+120,scopes,...override};
  const h=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
  const p=Buffer.from(JSON.stringify(payload)).toString('base64url');
  return h+'.'+p+'.'+createHmac('sha256',secret).update(h+'.'+p).digest('base64url');
 }
 const token=signedToken();
 async function request(path,{method='GET',body,authorization=token,key}={}){
  const headers={'authorization':authorization?'Bearer '+authorization:'','content-type':'application/json'};
  if(key)headers['idempotency-key']=key;
  const res=await fetch(base+path,{method,headers,body:body===undefined?undefined:typeof body==='string'?body:JSON.stringify(body)});
  return {status:res.status,body:await res.json()};
 }
 const buyer={buyerId:'B-GATE10TEST',identityRef:'fixture:buyer-id',consentRef:'fixture:consent',
  consentAt:new Date(now()).toISOString(),fundsRef:'fixture:funds',
  fundsVerifiedAt:new Date(now()).toISOString(),optedIn:true,consentScope:'property_offers',
  maxAllInUsd:230000,markets:['Houston'],assetTypes:['single_family']};
 const listing={id:'LIST-GATE10TEST',address:'Synthetic Example Lane, Houston, TX',
  market:'Houston',assetType:'single_family',listPriceUsd:180000,
  daysOnMarket:190,jurisdiction:'US-TX',sourceUrl:'https://example.org/synthetic-only',
  status:'active',statusVerifiedAt:new Date(now()).toISOString(),
  statusEvidenceRef:'fixture:status',sourceGrantRef:'fixture:grant',
  providerId:'gate10-synthetic',sourceType:'licensed_feed'};
 await t.test('missing/forged tokens and inadequate scopes are rejected',async()=>{
  assert.equal((await request('/v1/flipper/buyers',{authorization:''})).status,401);
  assert.equal((await request('/v1/flipper/buyers',{authorization:token.slice(0,-1)+'X'})).status,401);
  assert.equal((await request('/v1/flipper/buyers',{method:'POST',body:buyer,key:'key-gate10-test-1',
   authorization:signedToken(['buyer:read'])})).status,401);
 });
 await t.test('buyer POST registers synthetic-only consented record without exposing evidence',async()=>{
  const r=await request('/v1/flipper/buyers',{method:'POST',body:buyer,key:'key-gate10-test-1'});
  assert.equal(r.status,200);assert.equal(r.body.stored,true);
  const list=await request('/v1/flipper/buyers');
  assert.equal(list.status,200);assert.equal(list.body.buyers.length,1);
  assert.equal(JSON.stringify(list.body).includes('fixture:buyer-id'),false);
 });
 await t.test('idempotent replay succeeds; changed payload with same key conflicts',async()=>{
  const prior=await request('/v1/flipper/buyers',{method:'POST',body:buyer,key:'key-gate10-test-1'});
  assert.equal(prior.status,200);assert.equal(prior.body.idempotent,true);
  const conflict=await request('/v1/flipper/buyers',{method:'POST',
   body:{...buyer,maxAllInUsd:999999},key:'key-gate10-test-1'});
  assert.equal(conflict.status,409);assert.equal(conflict.body.error,'idempotency_conflict');
 });
 await t.test('listing intake rejects stale evidence and accepts fresh synthetic record',async()=>{
  const bad=await request('/v1/flipper/listings/import',{method:'POST',
   body:{...listing,statusVerifiedAt:'2020-01-01T00:00:00Z'},key:'key-gate10-test-2'});
  assert.equal(bad.status,400);
  const good=await request('/v1/flipper/listings/import',{method:'POST',
   body:listing,key:'key-gate10-test-3'});
  assert.equal(good.status,200);assert.equal(good.body.stored,true);
 });
 await t.test('research-only matching is visible with zero recognized revenue',async()=>{
  const r=await request('/v1/flipper/previews',{method:'POST',key:'key-gate10-test-4',
   body:{listingId:listing.id,valuation:{},costs:{},valuationEvidenceRef:'fixture:valuation-gate10'}});
  assert.equal(r.status,200);assert.equal(r.body.matches.length,1);
  assert.equal(r.body.matches[0].buyerId,buyer.buyerId);
  assert.equal(r.body.recognizedRevenueUsd,0);
  assert.equal(r.body.contactSent,false);assert.equal(r.body.contractSigned,false);
  assert.equal(previews.size,1);
 });
 await t.test('matching provider outage fails closed and writes no preview',async()=>{
  matchOutage=true;
  const r=await request('/v1/flipper/previews',{method:'POST',key:'key-gate10-test-5',
   body:{listingId:listing.id,valuation:{},costs:{},valuationEvidenceRef:'fixture:valuation-gate10'}});
  assert.equal(r.status,503);assert.equal(r.body.error,'buyer_matching_provider_unavailable');
  assert.equal(previews.size,1);matchOutage=false;
 });
 await t.test('withdrawn buyer disappears from matches immediately',async()=>{
  const x=await request('/v1/flipper/buyers/'+buyer.buyerId+'/suppress',
   {method:'POST',body:{},key:'key-gate10-test-6'});
  assert.equal(x.status,200);
  assert.equal((await request('/v1/flipper/buyers')).body.buyers.length,0);
  const r=await request('/v1/flipper/previews',{method:'POST',key:'key-gate10-test-7',
   body:{listingId:listing.id,valuation:{},costs:{},valuationEvidenceRef:'fixture:valuation-gate10'}});
  assert.equal(r.status,200);assert.equal(r.body.matches.length,0);
 });
 await t.test('revocation, oversized body and unsupported route fail closed',async()=>{
  revoked=true;assert.equal((await request('/v1/flipper/buyers')).status,401);revoked=false;
  const oversized=await request('/v1/flipper/buyers',{method:'POST',body:' '.repeat(66000),key:'key-gate10-test-8'});
  assert.equal(oversized.status,413);
  assert.equal((await request('/v1/flipper/not-a-route')).status,404);
 });
 await t.test('audit and previews contain no buyer contact details or banking data',async()=>{
  const r=await request('/v1/flipper/audit');
  assert.equal(r.status,200);assert.ok(r.body.events.length>=4);
  const raw=JSON.stringify(r.body)+JSON.stringify([...previews.values()]);
  assert.equal(raw.includes('bankAccount'),false);
  assert.equal(raw.includes('contactToken'),false);
 });
});
