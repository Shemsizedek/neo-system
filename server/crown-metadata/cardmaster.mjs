import {createHash} from 'node:crypto';

const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const str = (value,max=500) => typeof value === 'string' ? value.trim().slice(0,max) : '';
const https = value => { const u=new URL(value); if(u.protocol!=='https:'||u.username||u.password) throw new Error('https_source_required'); return u.href; };
const money = value => { if(typeof value!=='string'|| !/^(0|[1-9]\d*)(\.\d{1,12})?$/.test(value)) throw new Error('invalid_decimal_quote'); return value; };
/** Distinguishes verified observed quotes from aspirational, self-reported financial figures. */
export function buildMarketPanel(input={}) {
  if(input.kind==='unavailable'||!input.kind) return {state:'unavailable',label:'NO VERIFIED MARKET QUOTE',quote:null};
  if(input.kind==='target') return {state:'target',label:'TARGET — NOT A MARKET QUOTE',target:str(input.target,80),source_type:'operator_claim',quote:null};
  if(input.kind!=='observed') throw new Error('invalid_market_kind');
  if(!str(input.asset,255)||!str(input.venue,120)||!str(input.pair,120)||!str(input.currency,12)) throw new Error('quote_identity_required');
  const observedAt=new Date(input.observed_at);
  if(!Number.isFinite(observedAt.getTime())||observedAt.toISOString()!==input.observed_at) throw new Error('invalid_observation_time');
  const now=input.now?new Date(input.now):new Date();
  if(!Number.isFinite(now.getTime())||observedAt>now||now-observedAt>86400000) throw new Error('quote_stale_or_future');
  return {state:'observed',label:'OBSERVED QUOTE — NOT A VALUATION',quote:{asset:str(input.asset,255),price:money(input.price),currency:str(input.currency,12),pair:str(input.pair,120),venue:str(input.venue,120),observed_at:input.observed_at,source_url:https(input.source_url)},backing_verified:false};
}
/** Artwork prompt is creative direction, never evidence of ownership, backing or financial performance. */
export function buildCardmasterRecord({card_id,title,sector,issuer,visual_concept,market,financial_claims={}}) {
  if(!/^NEO-CARD-[A-Z0-9-]{3,80}$/.test(card_id)||!str(title,120)) throw new Error('invalid_card_identity');
  const safeClaims={};
  for(const key of ['target_value','projected_roi','acquisition_value','current_value','status']) {
    if(financial_claims[key]!==undefined) safeClaims[key]={value:str(financial_claims[key],100),classification:'unverified_operator_claim'};
  }
  const record={schema:'NEO-CARDMASTER-V1',card_id,title:str(title,120),sector:str(sector,120),issuer_label:str(issuer,120),issuer_verified:false,market_data:buildMarketPanel(market),financial_claims:safeClaims,artwork:{status:'prompt_ready',generated_image_url:null,prompt:'Premium vertical collectible card, charcoal and muted gold, cinematic illustration, accessible text overlay composed separately. Subject: '+str(visual_concept,600)+'. No invented price charts, endorsements, reserve guarantees or verified badges.'},provenance:{ledger_verified:false,issuer_verified:false,artwork_generated:false}};
  return {...record,content_hash:sha(record),hash_algorithm:'sha256-json-utf8'};
}
