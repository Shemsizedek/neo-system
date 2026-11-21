/** NEO-FLIP-005: no real provider wired; trusted authenticated adapters required. */
import {createHash} from 'node:crypto';
const ok=v=>typeof v==='string'&&v.length>0;
const fail=(code,status=400)=>{throw Object.assign(new Error(code),{code,status})};
const stamp=x=>Date.parse(x);
const recent=(x,n,max)=>Number.isFinite(stamp(x))&&stamp(x)<=n&&n-stamp(x)<=max;
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const buyerId=/^B-[A-Za-z0-9_-]{3,64}$/,listingId=/^[A-Za-z0-9_-]{3,100}$/;
const pii=['name','legalName','email','phone','address','contactToken','bankAccount','ssn','proofOfFundsRaw','identityDocument'];
const scopes=['buyer:read','buyer:write','listing:read','listing:write','deal:read','audit:read'];
function validateBuyer(x,now){
 if(!x||pii.some(k=>Object.hasOwn(x,k)))fail('private_buyer_data_requires_vault');
 if(!buyerId.test(x.buyerId||''))fail('buyer_id_invalid');
 if(x.optedIn!==true||x.consentScope!=='property_offers'||!ok(x.identityRef)||!ok(x.consentRef)||!ok(x.fundsRef))fail('buyer_evidence_missing');
 if(!recent(x.consentAt,now,365*86400000)||!recent(x.fundsVerifiedAt,now,90*86400000))fail('buyer_evidence_expired');
 if(!(typeof x.maxAllInUsd==='number'&&Number.isFinite(x.maxAllInUsd)&&x.maxAllInUsd>0))fail('budget_invalid');
 if(!Array.isArray(x.markets)||!x.markets.length||!Array.isArray(x.assetTypes)||!x.assetTypes.length||x.markets.length>12||x.assetTypes.length>12)fail('buy_box_invalid');
 return {buyerId:x.buyerId,identityRef:x.identityRef,consentRef:x.consentRef,fundsRef:x.fundsRef,consentAt:x.consentAt,
  fundsVerifiedAt:x.fundsVerifiedAt,optedIn:true,consentScope:'property_offers',maxAllInUsd:x.maxAllInUsd,
  markets:x.markets.map(a=>String(a).slice(0,100)),assetTypes:x.assetTypes.map(a=>String(a).slice(0,100))};
}
function validateListing(x,now){
 if(!x||!listingId.test(x.id||'')||x.jurisdiction!=='US-TX')fail('listing_id_or_jurisdiction_invalid');
 if(!ok(x.address)||!ok(x.market)||!ok(x.assetType)||!Number.isInteger(x.daysOnMarket)||x.daysOnMarket<120)fail('listing_fields_invalid');
 if(!(Number.isFinite(x.listPriceUsd)&&x.listPriceUsd>0)||!['active','for_sale'].includes(x.status))fail('listing_price_or_status_invalid');
 if(!recent(x.statusVerifiedAt,now,72*3600000)||!ok(x.statusEvidenceRef)||!ok(x.sourceGrantRef)||!ok(x.providerId))fail('listing_evidence_expired_or_missing');
 let url;try{url=new URL(x.sourceUrl)}catch{fail('source_url_invalid')};
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.port)fail('source_url_not_public_https');
 if(url.hostname.endsWith('har.com')&&x.sourceType!=='licensed_feed')fail('har_feed_license_required');
 return {id:x.id,address:x.address.slice(0,160),market:x.market.slice(0,100),assetType:x.assetType.slice(0,100),
  listPriceUsd:x.listPriceUsd,daysOnMarket:x.daysOnMarket,jurisdiction:'US-TX',sourceUrl:url.toString(),
  status:x.status,statusVerifiedAt:x.statusVerifiedAt,statusEvidenceRef:x.statusEvidenceRef,
  providerId:x.providerId,sourceType:x.sourceType,sourceGrantRef:x.sourceGrantRef};
}
export function createFlipperGate5({store,verifyToken,verifyBuyer,verifyListing,verifyValuation,matchBuyer,clock=()=>Date.now()}={}){
 if(!store||[verifyToken,verifyBuyer,verifyListing,verifyValuation,matchBuyer].some(fn=>typeof fn!=='function'))fail('trusted_adapters_required',503);
 const who=async(token,scope)=>{
  if(!scopes.includes(scope)||!ok(token))fail('unauthorized',401);
  let c;try{c=await verifyToken(token)}catch{fail('identity_provider_unavailable',503)}
  if(!c||c.signatureValidated!==true||c.iss!=='neo-pass'||c.aud!=='neo-flipper-staging'||c.active!==true||
   !ok(c.sub)||!Number.isInteger(c.exp)||c.exp<=Math.floor(clock()/1000)||!Array.isArray(c.scopes)||!c.scopes.includes(scope))fail('unauthorized',401);
  return c.sub.slice(0,120);
 };
 const key=k=>{if(!/^[A-Za-z0-9:_-]{8,100}$/.test(k||''))fail('idempotency_key_required')};
 const validated=async(fn,obj,sub,code)=>{try{if(await fn(obj,sub)!==true)fail(code,422)}catch(e){if(e.code)throw e;fail('provider_unavailable',503)}};
 return Object.freeze({
  async saveBuyer(token,data,k){const sub=await who(token,'buyer:write');key(k);
   const b=validateBuyer(data,clock());await validated(verifyBuyer,b,sub,'buyer_attestation_not_verified');
   return store.saveBuyer(b,sub,k,digest(b));},
  async suppress(token,id,k){const sub=await who(token,'buyer:write');key(k);if(!buyerId.test(id||''))fail('buyer_id_invalid');
   return store.suppressBuyer(id,sub,k);},
  async importListing(token,data,k){const sub=await who(token,'listing:write');key(k);
   const l=validateListing(data,clock());await validated(verifyListing,l,sub,'listing_attestation_not_verified');
   return store.saveListing(l,sub,k,digest(l));},
  async buyers(token){await who(token,'buyer:read');
   return (await store.listBuyers(clock())).map(b=>({buyerId:b.buyerId,markets:b.markets,assetTypes:b.assetTypes,maxAllInUsd:b.maxAllInUsd}));},
  async listings(token){await who(token,'listing:read');return store.listListings();},
  async preview(token,{listingId:id,valuation,costs,valuationEvidenceRef}={},k){const sub=await who(token,'deal:read');key(k);
   const l=await store.getListing(id);if(!l)fail('listing_not_found',404);
   if(!recent(l.statusVerifiedAt,clock(),72*3600000))fail('listing_status_expired',409);
   await validated(verifyListing,l,sub,'listing_permission_revoked');
   await validated(verifyValuation,{listing:l,valuation,costs,valuationEvidenceRef},sub,'valuation_not_verified');
   const matches=[];
   for(const b of await store.listBuyers(clock())){
    let m;try{m=await matchBuyer({listing:l,buyer:b,valuation,costs})}catch{continue}
    if(m?.status==='indicative_buyer_first_ceiling'&&Number.isFinite(m.maximumSellerContractPriceUsd)&&m.maximumSellerContractPriceUsd>0&&
      Number.isFinite(m.estimatedNetAssignmentFeeUsd)&&m.estimatedNetAssignmentFeeUsd>=0)
      matches.push({buyerId:b.buyerId,maximumSellerContractPriceUsd:m.maximumSellerContractPriceUsd,
       potentialNetAssignmentFeeUsd:m.estimatedNetAssignmentFeeUsd});
   }
   matches.sort((a,b)=>b.maximumSellerContractPriceUsd-a.maximumSellerContractPriceUsd);
   const p={listingId:id,matches,sourceEvidenceRef:l.statusEvidenceRef,
     valuationEvidenceRef:String(valuationEvidenceRef||'').slice(0,160),status:'research_only',recognizedRevenueUsd:0,contactSent:false,contractSigned:false};
   return store.savePreview(p,sub,k,digest(p));
  },
  async audit(token){await who(token,'audit:read');return store.audit();}
 });
}
export function createFlipperGate5HttpHandler(service){
 if(!service)fail('service_required');
 const respond=(res,status,data)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(data))};
 return async(req,res)=>{
  try{
   const token=/^Bearer (\S+)$/i.exec(req.headers.authorization||'')?.[1],key=req.headers['idempotency-key'];
   const u=new URL(req.url,'http://internal.invalid');let payload={};
   if(req.method==='POST'){
    let bytes=0;const chunks=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>65536)fail('payload_too_large',413);chunks.push(chunk)}
    try{payload=JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{fail('invalid_json')}
   }
   if(req.method==='GET'&&u.pathname==='/v1/flipper/buyers')return respond(res,200,{buyers:await service.buyers(token)});
   if(req.method==='GET'&&u.pathname==='/v1/flipper/listings')return respond(res,200,{listings:await service.listings(token)});
   if(req.method==='GET'&&u.pathname==='/v1/flipper/audit')return respond(res,200,{events:await service.audit(token)});
   if(req.method==='POST'&&u.pathname==='/v1/flipper/buyers')return respond(res,200,await service.saveBuyer(token,payload,key));
   const suppress=/^\/v1\/flipper\/buyers\/(B-[A-Za-z0-9_-]{3,64})\/suppress$/.exec(u.pathname);
   if(req.method==='POST'&&suppress)return respond(res,200,await service.suppress(token,suppress[1],key));
   if(req.method==='POST'&&u.pathname==='/v1/flipper/listings/import')return respond(res,200,await service.importListing(token,payload,key));
   if(req.method==='POST'&&u.pathname==='/v1/flipper/previews')return respond(res,200,await service.preview(token,payload,key));
   respond(res,404,{error:'not_found'});
  }catch(e){respond(res,[400,401,404,409,413,422,503].includes(e.status)?e.status:400,{error:e.code||'request_rejected'})}
 };
}
