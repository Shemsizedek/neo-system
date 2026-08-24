const SPEED_SCORE={INSTANT:5,MINUTES:4,HOURS:3,DAYS:1}

export function routeSettlement(input,rails){
  const candidates=rails.filter(r=>r.enabled&&r.status==='READY'&&(!r.currencies||r.currencies.includes(input.currency))&&(!r.jurisdictions||r.jurisdictions.includes('*')||r.jurisdictions.includes(input.jurisdiction)))
    .filter(r=>!input.allowedRails||input.allowedRails.includes(r.id))
    .map(r=>({
      ...r,
      score:(r.complianceApproved?25:-100)+(r.liquidityScore||0)*4+(SPEED_SCORE[r.speed]||0)*3-(r.feeBps||0)/10+(input.preferredRail===r.id?20:0)
    }))
    .filter(r=>r.score>0)
    .sort((a,b)=>b.score-a.score)
  if(!candidates.length)return{status:'BLOCKED',reason:'NO_COMPLIANT_SETTLEMENT_RAIL',primary:null,fallbacks:[]}
  return{status:'ROUTED',primary:candidates[0],fallbacks:candidates.slice(1,4),decisionAt:new Date().toISOString()}
}

export function failoverRoute(route,failedRailId){
  if(route.status!=='ROUTED')return route
  if(route.primary?.id!==failedRailId)return route
  const [next,...rest]=route.fallbacks||[]
  if(!next)return{status:'BLOCKED',reason:'ALL_SETTLEMENT_RAILS_FAILED',primary:null,fallbacks:[]}
  return{...route,primary:next,fallbacks:rest,failedRailId,failoverAt:new Date().toISOString()}
}

export function reconcileSettlement(expected,event){
  const amountOk=Math.abs(Number(expected.amount)-Number(event.amount))<=Number(expected.tolerance||0)
  const currencyOk=expected.currency===event.currency
  const referenceOk=expected.reference===event.reference
  const finalState=['SETTLED','POSTED','CONFIRMED','PAID'].includes(event.status)
  return{matched:amountOk&&currencyOk&&referenceOk&&finalState,checks:{amountOk,currencyOk,referenceOk,finalState}}
}

export const referenceRails=[
  {id:'NEO_WIRE_BTC',family:'BITCOIN',enabled:false,status:'UNCONFIGURED',currencies:['BTC'],jurisdictions:['*'],feeBps:20,liquidityScore:5,speed:'MINUTES',complianceApproved:false},
  {id:'NEO_WIRE_LIGHTNING',family:'LIGHTNING',enabled:false,status:'UNCONFIGURED',currencies:['BTC'],jurisdictions:['*'],feeBps:5,liquidityScore:4,speed:'INSTANT',complianceApproved:false},
  {id:'NEO_WIRE_XCP',family:'COUNTERPARTY',enabled:false,status:'UNCONFIGURED',currencies:['XCP','NOMNI'],jurisdictions:['*'],feeBps:25,liquidityScore:2,speed:'MINUTES',complianceApproved:false},
  {id:'NEO_WIRE_CES',family:'CES_MUTUAL_CREDIT',enabled:false,status:'UNCONFIGURED',currencies:['CES'],jurisdictions:['*'],feeBps:10,liquidityScore:2,speed:'MINUTES',complianceApproved:false},
  {id:'NEO_WIRE_BANK',family:'BANK',enabled:false,status:'UNCONFIGURED',currencies:['USD','EUR','GBP','JPY','CAD','AUD','CHF'],jurisdictions:['*'],feeBps:35,liquidityScore:5,speed:'HOURS',complianceApproved:false}
]
