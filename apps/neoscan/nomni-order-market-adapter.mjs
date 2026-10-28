import {normalizeNomniMarketObservation} from './nomni-market-provenance.mjs';
const BASE='https://api.counterparty.io:4000/v2';
export function createNomniOrderMarketAdapter({fetchJson,clock=()=>new Date().toISOString()}={}){
 if(typeof fetchJson!=='function')throw new TypeError('secure_fetch_required');
 return Object.freeze({async snapshot(){
  const url=BASE+'/assets/NOMNI/orders?status=open&limit=100';
  const body=await fetchJson(url,{method:'GET',redirect:'error',headers:{accept:'application/json'}});
  if(!Array.isArray(body?.result))throw new TypeError('invalid_orders_response');
  const rows=body.result.filter(row=>row?.status==='open'&&(
   row.give_asset==='NOMNI'&&row.get_asset==='XCP'||row.give_asset==='XCP'&&row.get_asset==='NOMNI'));
  const quotes=rows.map(row=>{
   const give=Number(row.give_remaining_normalized??row.give_quantity_normalized);
   const get=Number(row.get_remaining_normalized??row.get_quantity_normalized);
   if(!Number.isFinite(give)||!Number.isFinite(get)||give<=0||get<=0)return null;
   const ask=row.give_asset==='NOMNI';
   const p=ask?get/give:give/get;
   return Number.isFinite(p)&&p>0?{side:ask?'ask':'bid',price:p}:null;
  }).filter(Boolean);
  const asks=quotes.filter(x=>x.side==='ask').map(x=>x.price);
  const bids=quotes.filter(x=>x.side==='bid').map(x=>x.price);
  const at=clock();
  return {schema_version:'nomni.order-book.v0.1',asset:'NOMNI',pair:'NOMNI/XCP',provider:BASE,
    observed_at:at,source_timestamp:null,open_orders:rows.length,
    best_ask_xcp:asks.length?Math.min(...asks).toString():null,
    best_bid_xcp:bids.length?Math.max(...bids).toString():null,
    last_trade_xcp:null,verification_status:'provider_reported_unverified',
    crown_chain_attestation:null,market_value_verified:false};
 }});
}
