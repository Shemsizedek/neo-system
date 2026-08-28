export const PAYMENT_RAIL_TYPES=['CARD','ACH','WIRE','BTC_ONCHAIN','BTC_LIGHTNING','COUNTERPARTY','CES']

export const worldCurrencyCodes=(()=>{
  try{return Intl.supportedValuesOf('currency').sort()}catch{return ['USD','EUR','GBP','JPY','CHF','CAD','AUD','NZD','CNY','HKD','SGD','INR','AED','SAR','ZAR','MXN','BRL']}
})()

const list=value=>(value||'').split(',').map(v=>v.trim().toUpperCase()).filter(Boolean)
const enabled=value=>String(value).toLowerCase()==='true'

export const paymentRails=[
  {id:'card-global',type:'CARD',currencies:worldCurrencyCodes,status:'DISABLED',provider:'UNCONFIGURED'},
  {id:'ach-us',type:'ACH',currencies:['USD'],status:'DISABLED',provider:'UNCONFIGURED'},
  {id:'wire-global',type:'WIRE',currencies:worldCurrencyCodes,status:'DISABLED',provider:'UNCONFIGURED'},
  {id:'btc-onchain',type:'BTC_ONCHAIN',currencies:['BTC'],status:'DISABLED',provider:'UNCONFIGURED'},
  {id:'btc-lightning',type:'BTC_LIGHTNING',currencies:['BTC'],status:'DISABLED',provider:'UNCONFIGURED'},
  {id:'counterparty',type:'COUNTERPARTY',currencies:['XCP','NOMNI'],status:'DISABLED',provider:'UNCONFIGURED'},
  {id:'ces-mutual-credit',type:'CES',currencies:['CES'],status:'DISABLED',provider:'UNCONFIGURED'}
]

export function paymentRailsFromEnv(env=process.env){
  const fiatCurrencies=list(env.PAYMENT_FIAT_CURRENCIES)
  const acceptedFiat=fiatCurrencies.length?fiatCurrencies:worldCurrencyCodes
  return [
    {id:'card-global',type:'CARD',currencies:acceptedFiat,status:enabled(env.CARD_ENABLED)?'ENABLED':'DISABLED',provider:env.CARD_PROVIDER||'UNCONFIGURED',jurisdictions:list(env.CARD_JURISDICTIONS||'GLOBAL')},
    {id:'ach-us',type:'ACH',currencies:['USD'],status:enabled(env.ACH_ENABLED)?'ENABLED':'DISABLED',provider:env.ACH_PROVIDER||'UNCONFIGURED',jurisdictions:list(env.ACH_JURISDICTIONS||'US')},
    {id:'wire-global',type:'WIRE',currencies:acceptedFiat,status:enabled(env.WIRE_ENABLED)?'ENABLED':'DISABLED',provider:env.WIRE_PROVIDER||'UNCONFIGURED',jurisdictions:list(env.WIRE_JURISDICTIONS||'GLOBAL')},
    {id:'btc-onchain',type:'BTC_ONCHAIN',currencies:['BTC'],status:enabled(env.BTC_PAYMENTS_ENABLED)?'ENABLED':'DISABLED',provider:env.BTC_PAYMENT_PROVIDER||'UNCONFIGURED',jurisdictions:['GLOBAL']},
    {id:'btc-lightning',type:'BTC_LIGHTNING',currencies:['BTC'],status:enabled(env.LIGHTNING_PAYMENTS_ENABLED)?'ENABLED':'DISABLED',provider:env.LIGHTNING_PROVIDER||'UNCONFIGURED',jurisdictions:['GLOBAL']},
    {id:'counterparty',type:'COUNTERPARTY',currencies:['XCP','NOMNI'],status:enabled(env.COUNTERPARTY_PAYMENTS_ENABLED)?'ENABLED':'DISABLED',provider:env.COUNTERPARTY_PAYMENT_PROVIDER||'UNCONFIGURED',jurisdictions:['GLOBAL']},
    {id:'ces-mutual-credit',type:'CES',currencies:['CES'],status:enabled(env.CES_PAYMENTS_ENABLED)?'ENABLED':'DISABLED',provider:env.CES_PROVIDER||'UNCONFIGURED',jurisdictions:list(env.CES_JURISDICTIONS||'GLOBAL')}
  ]
}

export function eligibleRails({currency,jurisdiction='GLOBAL',rails=paymentRails}){
  const code=String(currency||'').toUpperCase()
  return rails.filter(r=>r.status==='ENABLED'&&r.currencies.includes(code)&&(!r.jurisdictions||r.jurisdictions.includes(jurisdiction)||r.jurisdictions.includes('GLOBAL')))
}

export function selectPaymentRail(input){
  const candidates=eligibleRails(input)
  if(!candidates.length) return {ok:false,reason:'NO_ENABLED_PAYMENT_RAIL'}
  return {ok:true,rail:candidates[0],alternates:candidates.slice(1)}
}

export function assertLiveRail(rail){
  if(!rail||rail.status!=='ENABLED') throw new Error('PAYMENT_RAIL_DISABLED')
  if(!rail.provider||rail.provider==='UNCONFIGURED') throw new Error('PAYMENT_PROVIDER_UNCONFIGURED')
  return true
}
