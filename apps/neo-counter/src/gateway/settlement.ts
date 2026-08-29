export type SettlementState='PENDING'|'DETECTED'|'SETTLED'|'CANCELLED'|'FAILED';

export type NeoSettlementResult={
  version:'1';
  service:string;
  orderId:string;
  paymentId:string;
  state:SettlementState;
  rail:string;
  asset?:string;
  reference?:string;
  confirmed:boolean;
  observedAt:string;
};

const RESULT_KEY='neo_settlement';

export function encodeSettlementResult(result:NeoSettlementResult):string{
  return btoa(unescape(encodeURIComponent(JSON.stringify(result))));
}

export function decodeSettlementResult(value:string|null):NeoSettlementResult|null{
  if(!value)return null;
  try{
    const parsed=JSON.parse(decodeURIComponent(escape(atob(value)))) as NeoSettlementResult;
    if(parsed.version!=='1'||!parsed.service||!parsed.orderId||!parsed.paymentId)return null;
    if(!['PENDING','DETECTED','SETTLED','CANCELLED','FAILED'].includes(parsed.state))return null;
    return parsed;
  }catch{return null;}
}

export function appendSettlementResult(base:string,result:NeoSettlementResult):string{
  const url=new URL(base);
  url.searchParams.set(RESULT_KEY,encodeSettlementResult(result));
  url.searchParams.set('neo_checkout',result.state==='SETTLED'?'success':result.state.toLowerCase());
  url.searchParams.set('payment_id',result.paymentId);
  if(result.reference)url.searchParams.set('reference',result.reference);
  return url.toString();
}

export function settlementFromSearch(search=window.location.search):NeoSettlementResult|null{
  return decodeSettlementResult(new URLSearchParams(search).get(RESULT_KEY));
}

export function isFulfillmentEligible(result:NeoSettlementResult|null):boolean{
  return Boolean(result?.state==='SETTLED'&&result.confirmed&&result.reference);
}
