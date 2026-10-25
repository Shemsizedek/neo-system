// NCC-014: strictly read-only enhanced metadata readiness. This is a diagnostic, not a minting or signing authority.
import {validateLegacyEnhancedJSON,crownIssuanceDescription} from './issuance-autopublish.mjs';

const CORE='https://api.counterparty.io:4000/v2';
const MIRROR='https://neo-crown-cardmaster-staging.onrender.com';
const TOKENSCAN='https://tokenscan.io/api/asset/';
const ASSET=/^[A-Z][A-Z0-9]{0,23}$/;
const MAX_BYTES=16384;
const REQUEST_TIMEOUT_MS=4500;
const CACHE_MS=90000;
const safeTime=now=>new Date(now()).toISOString();
const sorted=value=>JSON.stringify(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)));
const same=(one,two)=>sorted(one)===sorted(two);

function validateAsset(asset){
  if(typeof asset!=='string'||!ASSET.test(asset))throw Error('invalid_asset');
  return asset;
}
function strictMetadata(value,asset){
  const payload=validateLegacyEnhancedJSON(value);
  if(payload.asset!==asset||typeof payload.description!=='string'||!payload.description.trim())throw Error('asset_or_description_mismatch');
  return payload;
}
async function readJson(url,fetchImpl){
  const abort=new AbortController();
  const timeout=setTimeout(()=>abort.abort(),REQUEST_TIMEOUT_MS);
  let http_status=null;
  try{
    const response=await fetchImpl(url,{method:'GET',redirect:'error',signal:abort.signal,headers:{accept:'application/json','user-agent':'NEO-Crown-ReadOnly-Metadata-Diagnostics/1.0'}});
    http_status=response?.status??null;
    if(http_status!==200)return {state:'unavailable',http_status,payload:null};
    if(response.redirected||response.headers?.get?.('location'))return {state:'invalid',http_status,payload:null};
    if(!response.headers?.get?.('content-type')?.toLowerCase().includes('application/json'))return {state:'invalid',http_status,payload:null};
    const length=Number(response.headers?.get?.('content-length')??0);
    if(Number.isFinite(length)&&length>MAX_BYTES)return {state:'invalid',http_status,payload:null};
    const reader=response.body?.getReader?.();
    if(!reader)return {state:'invalid',http_status,payload:null};
    let bytes=0;const chunks=[];
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      bytes+=value.byteLength;
      if(bytes>MAX_BYTES){await reader.cancel();return {state:'invalid',http_status,payload:null};}
      chunks.push(value);
    }
    const body=new Uint8Array(bytes);let offset=0;
    for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.byteLength;}
    const payload=JSON.parse(new TextDecoder().decode(body));
    if(!payload||typeof payload!=='object'||Array.isArray(payload))return {state:'invalid',http_status,payload:null};
    return {state:'received',http_status,payload};
  }catch{return {state:'unavailable',http_status,payload:null};}
  finally{clearTimeout(timeout);}
}
function metadataObservation(raw,asset,expected){
  if(raw.state!=='received')return {state:raw.state,http_status:raw.http_status};
  try{
    const payload=strictMetadata(raw.payload,asset);
    return {state:same(payload,expected)?'matches_approved':'differs_from_approved',http_status:raw.http_status};
  }catch{return {state:'invalid',http_status:raw.http_status};}
}
function assetPointerObservation(raw,asset,url){
  if(raw.state!=='received')return {state:raw.state,http_status:raw.http_status};
  const object=raw.payload?.result??raw.payload;
  if(!object||typeof object!=='object'||Array.isArray(object)||object.asset!==asset||typeof object.description!=='string')return {state:'invalid',http_status:raw.http_status};
  return {state:object.description===url?'points_to_canonical':'different_description',http_status:raw.http_status};
}
function summary(canonical,mirror,counterparty,tokenscan){
  if(canonical.state!=='matches_approved')return 'canonical_blocked';
  if(mirror.state!=='matches_approved')return 'mirror_not_verified';
  if(counterparty.state!=='points_to_canonical')return 'counterparty_pointer_not_verified';
  if(tokenscan.state!=='points_to_canonical')return 'tokenscan_pointer_not_verified';
  return 'canonical_ready_explorer_enrichment_unverified';
}

export function createCrownMetadataReadinessService({fetchImpl=globalThis.fetch,now=()=>new Date()}={}){
  const cache=new Map(),pending=new Map();
  async function inspect(asset,approvedMetadata){
    const safeAsset=validateAsset(asset);
    const approved=strictMetadata(approvedMetadata,safeAsset);
    const cacheKey=safeAsset+'|'+sorted(approved);
    const millis=new Date(now()).getTime();
    const previous=cache.get(cacheKey);
    if(previous&&millis>=previous.at&&millis-previous.at<CACHE_MS)return previous.result;
    if(pending.has(cacheKey))return pending.get(cacheKey);
    const run=(async()=>{
      const canonicalUrl=crownIssuanceDescription(safeAsset);
      const mirrorUrl=MIRROR+'/assets/'+safeAsset+'/tokenscan.json';
      const coreUrl=CORE+'/assets/'+safeAsset;
      const tokenscanUrl=TOKENSCAN+safeAsset;
      const [canonicalResponse,mirrorResponse,coreResponse,tokenResponse]=await Promise.all([
        readJson(canonicalUrl,fetchImpl),readJson(mirrorUrl,fetchImpl),
        readJson(coreUrl,fetchImpl),readJson(tokenscanUrl,fetchImpl)
      ]);
      const canonical={url:canonicalUrl,...metadataObservation(canonicalResponse,safeAsset,approved)};
      const mirror={url:mirrorUrl,...metadataObservation(mirrorResponse,safeAsset,approved)};
      const counterparty={url:coreUrl,...assetPointerObservation(coreResponse,safeAsset,canonicalUrl)};
      const tokenscan={url:tokenscanUrl,...assetPointerObservation(tokenResponse,safeAsset,canonicalUrl)};
      const status=summary(canonical,mirror,counterparty,tokenscan);
      const result={
        schema:'neo.crown.metadata-readiness.v1',asset:safeAsset,checked_at:safeTime(now),
        status,canonical,mirror,counterparty,tokenscan,
        explorer_additional_information_verified:false,
        note:'TokenScan asset API description confirms only the on-chain pointer, not enhanced metadata ingestion or page visibility.',
        no_issuer_ownership_verified:true,issuer_signing_authorized:false,
        safe_to_issue:false,read_only:true,price:null,price_verified:false,
        next_gate:status==='canonical_blocked'
          ?'Bind the canonical hostname and verify its direct HTTPS JSON response without redirect.'
          :status==='canonical_ready_explorer_enrichment_unverified'
          ?'Independently verify TokenScan enhanced-information display; do not reissue asset supply.'
          :'Review the failed source check and do not sign or publish financial claims.'
      };
      cache.set(cacheKey,{at:millis,result});
      if(cache.size>30)cache.delete(cache.keys().next().value);
      return result;
    })();
    pending.set(cacheKey,run);
    try{return await run;}finally{pending.delete(cacheKey);}
  }
  return {inspect};
}
