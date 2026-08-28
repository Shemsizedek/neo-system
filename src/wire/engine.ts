import type {NetworkService,SettlementRail,WireQuote,WireTransaction} from './types'

export const worldCurrencies=['USD','EUR','GBP','JPY','CNY','CAD','CHF','AUD','INR','AED','MXN','BTC','XCP','NEO','CES'] as const
export const rails:SettlementRail[]=['Bitcoin','Lightning','Counterparty XCP','CES Mutual Credit']

export const networkServices:NetworkService[]=[
  {id:'btc',name:'Bitcoin Gateway',status:'READY',description:'Final settlement boundary'},
  {id:'ln',name:'Lightning Router',status:'READY',description:'Instant micropayment boundary'},
  {id:'xcp',name:'Counterparty API',status:'READY',description:'XCP and tokenized asset layer'},
  {id:'noogle-fi',name:'Noogle Fi Service Fabric',status:'ACTIVE',description:'Background telecom provider discovery, routing, health, and failover for NEO Wire'},
  {id:'ces',name:'CES Coordinator Gateway',status:'SANDBOX',description:'Mutual-credit account and trade reconciliation layer'},
  {id:'sms',name:'SMS Gateway',status:'SANDBOX',description:'Routed through Noogle Fi provider adapters'},
  {id:'ivr',name:'IVR Gateway',status:'SANDBOX',description:'Routed through Noogle Fi provider adapters'},
  {id:'nvsn',name:'NVSN Bridge',status:'READY',description:'Virtual satellite routing integration through Noogle Fi'},
  {id:'fx',name:'World Currency Engine',status:'READY',description:'Multi-currency quote and display layer'}
]

export const seedTransactions:WireTransaction[]=[
  {id:'NW-2026-000001',kind:'WIRE',party:'+1 210 555 0144',amount:500,currency:'USD',rail:'Bitcoin',status:'DEMO_SETTLED',createdAt:'08:41'},
  {id:'NW-2026-000002',kind:'MOBILE',party:'NEO Global 50',amount:49.99,currency:'USD',rail:'Lightning',status:'DEMO_PAID',createdAt:'08:46'},
  {id:'NW-2026-000003',kind:'ASSET',party:'WORLDUSD',amount:100,currency:'XCP',rail:'Counterparty XCP',status:'DEMO_PENDING',createdAt:'08:52'},
  {id:'NW-2026-000004',kind:'WIRE',party:'CES-DEMO-MEMBER',amount:144,currency:'CES',rail:'CES Mutual Credit',status:'DEMO_PENDING',createdAt:'08:57'}
]

export function quoteWire(amount:number,currency:string,rail:SettlementRail):WireQuote{
  const safe=Math.max(0,Number.isFinite(amount)?amount:0)
  const networkFeeLabel=rail==='Lightning'?'Lightning routing fee (demo)':rail==='Bitcoin'?'Bitcoin network fee (demo)':rail==='Counterparty XCP'?'Counterparty + Bitcoin fee (demo)':'CES exchange/trade fee or levy (demo)'
  return {amount:safe,currency,rail,display:`${safe.toLocaleString(undefined,{maximumFractionDigits:8})} ${currency} → ${rail}`,networkFeeLabel}
}

export function createDemoWire(input:{party:string;amount:number;currency:string;rail:SettlementRail},sequence:number):WireTransaction{
  return {id:`NW-2026-${String(sequence).padStart(6,'0')}`,kind:'WIRE',party:input.party||'UNRESOLVED',amount:Math.max(0,input.amount),currency:input.currency,rail:input.rail,status:'DEMO_PENDING',createdAt:new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
}
