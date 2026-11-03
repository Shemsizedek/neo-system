// NEO Terminal NOMNI/USD activation controls. No custody, signing or broadcast.
import {counterpartyAsset,DEFAULT_SOURCES,getJson} from './gateway.js';
export const REQUIRED_GATES=Object.freeze(['assetIdentity','usdSettlement','marketLiquidity','counterpaySigner','crownChain','neoLedger','neoBooks','legalReview']);
export function evaluateActivation(evidence={}){
 const checks=Object.fromEntries(REQUIRED_GATES.map(key=>[key,{passed:evidence[key]?.verified===true&&typeof evidence[key]?.reference==='string'&&evidence[key].reference.trim().length>0,reference:evidence[key]?.reference??null}]));
 const ready=REQUIRED_GATES.every(key=>checks[key].passed);
 return {market:'NOMNI/USD',state:ready?'READY_FOR_INDEPENDENT_REVIEW':'BLOCKED',checks,publicTradingEnabled:false,executionEnabled:false,reason:ready?'All documentary gates supplied; independent approval and controlled release still required.':'Missing verified evidence for one or more activation gates.'};
}
export async function inspectNomniMarket({fetchImpl=fetch,counterpartyBase=DEFAULT_SOURCES.counterparty}={}){
 const opts={fetchImpl,counterpartyBase};
 const asset=await counterpartyAsset('NOMNI',opts);
 const data=await getJson(counterpartyBase+'/assets/NOMNI/orders?status=open&limit=100',opts);
 const orders=Array.isArray(data?.result)?data.result:[];
 const eligible=orders.filter(o=>o?.status==='open'&&((o.give_asset==='NOMNI'&&o.get_asset==='USD')||(o.give_asset==='USD'&&o.get_asset==='NOMNI')));
 return {market:'NOMNI/USD',nomni:asset,usdInstrument:'UNVERIFIED',counterpartyOrdersObserved:eligible.length,orders:eligible.map(o=>({txHash:o.tx_hash??null,giveAsset:o.give_asset,getAsset:o.get_asset,giveRemaining:o.give_remaining_normalized??null,getRemaining:o.get_remaining_normalized??null})),executable:false,reason:'An asset named USD does not establish redeemable US dollars; venue liquidity and settlement rights remain unverified.',observedAt:new Date().toISOString()};
}
