// NOMNI-SEO-021: retail-facing read-only market verification projection.
// No amounts or backing status are inferred from issuer-supplied metadata.
export function projectNomniMarketStatus({counterpartyObservation=null,crownSummary=null}={}){
 const observed=counterpartyObservation?.asset==='NOMNI'?counterpartyObservation:null;
 const chain=observed?.verification_status==='provider_observed_unconfirmed'
  ?'Reported by Counterparty data provider — not independently confirmed'
  :'No verified blockchain observation';
 const crown=crownSummary?.asset==='NOMNI'&&crownSummary?.status==='blockchain-evidence-available'
  ?'Blockchain evidence available for review'
  :'No independently verified Crown Chain evidence';
 return Object.freeze({
  schema_version:'nomni.market-public.v0.1',asset:'NOMNI',name:'Noocratic Open Market Natural Index',
  labels:{blockchain:chain,crown_chain:crown,reserves:'Backing not independently verified',
    legal_rights:'Legal ownership not independently verified',valuation:'No independently verified market valuation',
    index:'No calculated NOMNI index level'},
  reported_supply:observed?.source_claims?.supply_normalized??null,
  reported_issuer_address:observed?.source_claims?.issuer_address??null,
  market_price:null,index_level:null,reserve_value:null,
  verified_at:null,operational_mode:'read-only-prototype',trading_enabled:false,
  disclaimer:'Blockchain issuance, source-reported supply, reserve backing, enforceable rights and market valuation are separate facts.'
 });
}
