export const PAYMENT_RAIL_TYPES=['CARD','ACH','WIRE','BTC_ONCHAIN','BTC_LIGHTNING','COUNTERPARTY','CES']

export const paymentRails=[
  {id:'card-us',type:'CARD',currencies:['USD','EUR','GBP','CAD','AUD'],status:'DISABLED',provider:'UNCONFIGURED'},
  {id:'ach-us',type:'ACH',currencies:['USD'],status:'DISABLED',provider:'UNCONFIGURED'},
  {id:'wire-global',type:'WIRE',currencies:['USD','EUR','GBP','JPY','CHF','CAD','AUD'],status:'DISABLED',provider:'UNCONFIGURED'},
  {id:'btc-onchain',type:'BTC_ONCHAIN',currencies:['BTC'],status:'DISABLED',provider:'UNCONFIGURED'},
  {id:'btc-lightning',type:'BTC_LIGHTNING',currencies:['BTC'],status:'DISABLED',provider:'UNCONFIGURED'},
  {id:'counterparty',type:'COUNTERPARTY',currencies:['XCP','NOMNI'],status:'DISABLED',provider:'UNCONFIGURED'},
  {id:'ces-mutual-credit',type:'CES',currencies:['CES'],status:'DISABLED',provider:'UNCONFIGURED'}
]

export function eligibleRails({currency,jurisdiction='GLOBAL',rails=paymentRails}){
  return rails.filter(r=>r.status==='ENABLED'&&r.currencies.includes(currency)&&(!r.jurisdictions||r.jurisdictions.includes(jurisdiction)||r.jurisdictions.includes('GLOBAL')))
}

export function selectPaymentRail(input){
  const candidates=eligibleRails(input)
  if(!candidates.length) return {ok:false,reason:'NO_ENABLED_PAYMENT_RAIL'}
  return {ok:true,rail:candidates[0]}
}

export function assertLiveRail(rail){
  if(!rail||rail.status!=='ENABLED') throw new Error('PAYMENT_RAIL_DISABLED')
  if(!rail.provider||rail.provider==='UNCONFIGURED') throw new Error('PAYMENT_PROVIDER_UNCONFIGURED')
  return true
}
