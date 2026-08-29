const ORDER_KEY='neo-checkout:neo-exchange:last-order';

export function rememberExchangeOrder(orderId){
  try{sessionStorage.setItem(ORDER_KEY,orderId)}catch{}
}

export function readExchangeSettlement(search=window.location.search){
  const p=new URLSearchParams(search);
  const state=p.get('settlement_state');
  if(!state)return null;
  const paymentId=p.get('payment_id');
  const reference=p.get('reference');
  const confirmed=p.get('settlement_confirmed')==='1';
  let expectedOrder=null;
  try{expectedOrder=sessionStorage.getItem(ORDER_KEY)}catch{}
  return {
    state,
    paymentId,
    reference,
    confirmed,
    expectedOrder,
    fulfillmentEligible:state==='SETTLED'&&confirmed&&Boolean(reference)
  };
}
