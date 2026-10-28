// NOMNI-SEO-026: separate market observations from Crown Chain evidence.
// Market data is provider-reported, never a legal or reserve attestation.
const DECIMAL=/^(?:0|[1-9]\d*)(?:\.\d{1,18})?$/;
export function normalizeNomniMarketObservation(input,{observedAt=new Date().toISOString()}={}){
 if(!input||input.asset!=='NOMNI'||input.pair!=='NOMNI/XCP')throw new TypeError('invalid_market_pair');
 if(!['xcpdex-screen','counterparty-v2'].includes(input.source_kind))throw new TypeError('unapproved_market_source');
 if(typeof input.price_xcp!=='string'||!DECIMAL.test(input.price_xcp)||Number(input.price_xcp)<=0)throw new TypeError('invalid_market_price');
 if(!Number.isFinite(Date.parse(observedAt)))throw new TypeError('invalid_observed_at');
 if(!Number.isFinite(Date.parse(input.source_timestamp)))throw new TypeError('source_timestamp_required');
 return Object.freeze({schema_version:'nomni.market-observation.v0.1',asset:'NOMNI',pair:'NOMNI/XCP',
  price_xcp:input.price_xcp,source_kind:input.source_kind,source_timestamp:input.source_timestamp,observed_at:observedAt,
  evidence_url:typeof input.evidence_url==='string'&&input.evidence_url.startsWith('https://')?input.evidence_url:null,
  classification:'exchange_reported_unverified',live_quote_verified:false,crown_attestation_verified:false,
  reserve_backing_verified:false,legal_ownership_verified:false,index_level:null});
}
export function projectNomniMarketWithProvenance({marketObservation=null,crownEvidence=null}={}){
 const market=marketObservation?.asset==='NOMNI'?marketObservation:null;
 return Object.freeze({asset:'NOMNI',market:market?{pair:market.pair,price_xcp:market.price_xcp,
   observed_at:market.observed_at,source_timestamp:market.source_timestamp,status:market.classification}:null,
   crown_chain:crownEvidence?.asset==='NOMNI'?{status:crownEvidence.attestation_status,
     signature_verified:crownEvidence.signature_verified===true}:null,
   market_value_verified:false,reserves_verified:false,legal_rights_verified:false,index_level:null});
}
