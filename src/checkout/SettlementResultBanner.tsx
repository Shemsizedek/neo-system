import {useMemo} from 'react'

type Props={serviceId:string}

type SettlementResult={paymentId:string|null;state:string;confirmed:boolean;reference:string|null;fulfillmentEligible:boolean}

function readResult():SettlementResult|null{
 const p=new URLSearchParams(window.location.search)
 const state=p.get('settlement_state')
 if(!state)return null
 const confirmed=p.get('settlement_confirmed')==='1'
 const reference=p.get('reference')||null
 return {paymentId:p.get('payment_id'),state,confirmed,reference,fulfillmentEligible:state==='SETTLED'&&confirmed&&Boolean(reference)}
}

export function SettlementResultBanner({serviceId}:Props){
 const result=useMemo(readResult,[])
 if(!result)return null
 const expected=sessionStorage.getItem(`neo-checkout-order:${serviceId}`)
 return <section aria-label="NEO Counter settlement result" style={{margin:'16px 18px',padding:16,border:'1px solid rgba(91,255,154,.35)',borderRadius:14,background:'rgba(5,20,12,.82)',color:'#d9ffe3'}}>
   <strong style={{display:'block'}}>NEO Counter Settlement: {result.state}</strong>
   <small style={{display:'block',marginTop:6,opacity:.78}}>Payment {result.paymentId||'unknown'}{expected?` · originating order ${expected}`:''}</small>
   {result.reference&&<small style={{display:'block',marginTop:4,opacity:.78}}>Blockchain reference: {result.reference}</small>}
   <p style={{margin:'10px 0 0',fontSize:12,opacity:.8}}>{result.fulfillmentEligible?'Returned result is fulfillment-eligible only after this service independently verifies the blockchain reference and confirmation policy.':'Do not fulfill from this browser return. A confirmed SETTLED result with a blockchain reference is required.'}</p>
 </section>
}
