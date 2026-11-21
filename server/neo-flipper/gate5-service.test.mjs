import test from 'node:test';
import assert from 'node:assert/strict';
import {createFlipperGate5} from './gate5-service.mjs';
const now=Date.parse('2026-11-20T20:00:00-06:00');
const token={signatureValidated:true,iss:'neo-pass',aud:'neo-flipper-staging',active:true,
 sub:'test-operator',exp:Math.floor(now/1000)+3600,
 scopes:['buyer:read','buyer:write','listing:read','listing:write','deal:read','audit:read']};
const baseBuyer={buyerId:'B-DEMO123',identityRef:'vault:identity',consentRef:'vault:consent',
 consentAt:new Date(now).toISOString(),fundsRef:'vault:funds',fundsVerifiedAt:new Date(now).toISOString(),
 optedIn:true,consentScope:'property_offers',maxAllInUsd:250000,markets:['Houston'],assetTypes:['single_family']};
const baseListing={id:'LIST-DEMO',address:'Demo Street Houston',market:'Houston',assetType:'single_family',
 listPriceUsd:200000,daysOnMarket:180,jurisdiction:'US-TX',sourceUrl:'https://example.org/listing',
 status:'active',statusVerifiedAt:new Date(now).toISOString(),statusEvidenceRef:'vault:status',
 providerId:'licensed-feed',sourceType:'licensed_feed',sourceGrantRef:'vault:license'};
const create=({claims=token,verifyBuyer=async()=>true,verifyListing=async()=>true}={})=>{
 const state={buyers:new Map(),listings:new Map(),previews:[],audits:[]};
 const store={
  async saveBuyer(b){state.buyers.set(b.buyerId,b);state.audits.push('buyer_upsert');return {stored:true}},
  async suppressBuyer(id){state.buyers.delete(id);state.audits.push('buyer_suppress');return {suppressed:true}},
  async saveListing(l){state.listings.set(l.id,l);state.audits.push('listing_upsert');return {stored:true}},
  async getListing(id){return state.listings.get(id)},
  async listBuyers(){return [...state.buyers.values()]},
  async listListings(){return [...state.listings.values()]},
  async savePreview(p){state.previews.push(p);return p},
  async audit(){return state.audits}
 };
 const service=createFlipperGate5({store,clock:()=>now,verifyToken:async()=>claims,verifyBuyer,verifyListing,verifyValuation:async()=>true,
  matchBuyer:async()=>({status:'indicative_buyer_first_ceiling',maximumSellerContractPriceUsd:150000,estimatedNetAssignmentFeeUsd:8500})});
 return {service,state};
};
test('fail closed without trusted adapters',()=>assert.throws(()=>createFlipperGate5({}),/trusted_adapters_required/));
test('signed and scoped session required',async()=>{
 const {service}=create({claims:{...token,signatureValidated:false}});
 await assert.rejects(service.buyers('bearer'),/unauthorized/);
});
test('reject direct buyer personal data and invalid consent',async()=>{
 const {service}=create();
 await assert.rejects(service.saveBuyer('bearer',{...baseBuyer,email:'private@example.org'},'requestkey-1234'),/private_buyer_data_requires_vault/);
 await assert.rejects(service.saveBuyer('bearer',{...baseBuyer,optedIn:false},'requestkey-1234'),/buyer_evidence_missing/);
});
test('provider failure blocks buyer registration',async()=>{
 const {service}=create({verifyBuyer:async()=>false});
 await assert.rejects(service.saveBuyer('bearer',baseBuyer,'requestkey-1234'),/buyer_attestation_not_verified/);
});
test('qualified buyer summaries omit identity and funds references',async()=>{
 const {service}=create();
 await service.saveBuyer('bearer',baseBuyer,'requestkey-1234');
 const data=await service.buyers('bearer');
 assert.equal(data.length,1);assert.equal(data[0].buyerId,'B-DEMO123');
 assert.equal(JSON.stringify(data).includes('vault:funds'),false);
});
test('unlicensed HAR page is rejected',async()=>{
 const {service}=create();
 await assert.rejects(service.importListing('bearer',{...baseListing,sourceUrl:'https://www.har.com/homedetail/1',sourceType:'permitted_public_record'},'requestkey-1234'),/har_feed_license_required/);
});
test('listing status expires after 72 hours',async()=>{
 const {service}=create();
 const old=new Date(now-96*3600000).toISOString();
 await assert.rejects(service.importListing('bearer',{...baseListing,statusVerifiedAt:old},'requestkey-1234'),/listing_evidence_expired_or_missing/);
});
test('preview is advisory with no reported revenue or signature',async()=>{
 const {service}=create();
 await service.saveBuyer('bearer',baseBuyer,'requestkey-1234');
 await service.importListing('bearer',baseListing,'requestkey-5678');
 const p=await service.preview('bearer',{listingId:baseListing.id,valuation:{},costs:{},valuationEvidenceRef:'vault:comps'},'requestkey-9012');
 assert.equal(p.status,'research_only');assert.equal(p.matches.length,1);assert.equal(p.recognizedRevenueUsd,0);assert.equal(p.contractSigned,false);
});
test('suppress buyer prevents matches',async()=>{
 const {service}=create();await service.saveBuyer('bearer',baseBuyer,'requestkey-1234');
 await service.importListing('bearer',baseListing,'requestkey-5678');
 await service.suppress('bearer',baseBuyer.buyerId,'requestkey-9012');
 const p=await service.preview('bearer',{listingId:baseListing.id,valuation:{},costs:{},valuationEvidenceRef:'vault:comps'},'requestkey-3456');
 assert.equal(p.matches.length,0);
});
