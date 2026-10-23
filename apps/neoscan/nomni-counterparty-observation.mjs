// NOMNI-SEO-016 — read-only Counterparty v2 asset observation parser.
// Transport is injected and must comply with the security policy of the production runtime.
// No issuer identity, ownership of off-chain assets, reserves, or price is inferred.
const BASE='https://api.counterparty.io:4000/v2';
export function parseCounterpartyAssetObservation(asset,body,{retrievedAt=new Date().toISOString(),source=BASE}={}){
 if(!/^[A-Z][A-Z0-9_.]{0,63}$/.test(asset))throw new TypeError('invalid_asset');
 const record=body?.result;
 const item=Array.isArray(record)?record[0]:record;
 if(!item||typeof item!=='object'||Array.isArray(item))throw new TypeError('invalid_counterparty_response');
 if(item.asset && item.asset!==asset)throw new TypeError('asset_mismatch');
 const issuer=typeof item.issuer==='string'?item.issuer:null;
 const supply=typeof item.supply_normalized==='string'?item.supply_normalized:null;
 return Object.freeze({asset,network:'Bitcoin/Counterparty',source_url:`${source}/assets/${encodeURIComponent(asset)}`,
   observed_at:retrievedAt,source_claims:{issuer_address:issuer,divisible:item.divisible===true,locked:item.locked===true,supply_normalized:supply},
   verification_status:'provider_observed_unconfirmed',bitcoin_confirmation_status:'not_checked',
   independently_verified_reserves:false,real_world_asset_rights:'not_verified',
   index_value:null,market_price:null});
}
export function createCounterpartyObservationAdapter({fetchJson}={}){
 if(typeof fetchJson!=='function')throw new TypeError('fetch_json_required');
 return Object.freeze({async observe(asset='NOMNI'){
   if(!/^[A-Z][A-Z0-9_.]{0,63}$/.test(asset))throw new TypeError('invalid_asset');
   const sourceUrl=`${BASE}/assets/${encodeURIComponent(asset)}`;
   const body=await fetchJson(sourceUrl);
   return parseCounterpartyAssetObservation(asset,body,{source:BASE});
 }});
}
