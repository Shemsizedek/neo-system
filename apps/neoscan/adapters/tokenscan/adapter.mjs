export const TOKENSCAN_SCHEMA='neo.tokenscan.adapter.v1';
const DEFAULT_BASE='https://tokenscan.io/api/asset';

function clean(value){return String(value??'').trim();}
function first(record,keys){for(const key of keys){if(record?.[key]!==undefined&&record?.[key]!==null)return record[key]}return null;}

export function createTokenScanAdapter(config={}){
  const baseUrl=String(config.baseUrl||DEFAULT_BASE).replace(/\/$/,'');
  const fetchImpl=config.fetchImpl||fetch;

  function status(){return {schema:TOKENSCAN_SCHEMA,configured:Boolean(baseUrl),baseUrl,readOnly:true,connectionState:'read-only-source-adapter'};}

  async function getAsset({asset='NOMNI',signal}={}){
    const symbol=clean(asset).toUpperCase();
    if(!symbol)throw new Error('TokenScan asset symbol is required');
    const url=`${baseUrl}/${encodeURIComponent(symbol)}`;
    const response=await fetchImpl(url,{headers:{accept:'application/json'},signal});
    if(!response.ok)throw new Error(`TokenScan upstream returned ${response.status}`);
    const payload=await response.json();
    const record=payload?.asset&&typeof payload.asset==='object'?payload.asset:
      payload?.result&&typeof payload.result==='object'?payload.result:payload;
    if(!record||typeof record!=='object'||Array.isArray(record))throw new Error('TokenScan response must be an object');
    const returnedAsset=clean(first(record,['asset','asset_name','name','symbol'])||symbol).toUpperCase();
    if(returnedAsset!==symbol)throw new Error(`TokenScan returned ${returnedAsset} for requested ${symbol}`);
    const supply=first(record,['supply','quantity','total_supply','asset_supply']);
    return {
      schema:TOKENSCAN_SCHEMA,
      source:'tokenscan',
      readOnly:true,
      evidenceStatus:'source-observed',
      asset:symbol,
      issuer:first(record,['issuer','owner','asset_owner_address']),
      supply:supply===null?null:String(supply),
      divisible:first(record,['divisible','asset_divisible']),
      locked:first(record,['locked','is_locked']),
      description:first(record,['description','asset_description']),
      sourceUrl:url,
      observedAt:new Date().toISOString(),
      raw:record
    };
  }

  return {status,getAsset};
}
