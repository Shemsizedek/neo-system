(function(global){
  const DEFAULT_BASE='https://shemsizedek.github.io/neo-system/neo-counter/';
  function url(options){
    if(!options||!Number.isInteger(options.amountCents)||options.amountCents<=0)throw new Error('amountCents must be a positive integer');
    const u=new URL(options.baseUrl||DEFAULT_BASE);
    u.searchParams.set('checkout','1');
    u.searchParams.set('amount',String(options.amountCents));
    u.searchParams.set('service',String(options.service||'neo-service'));
    u.searchParams.set('order',String(options.orderId||('neo_order_'+crypto.randomUUID())));
    u.searchParams.set('label',String(options.label||options.service||'NEO Service'));
    if(options.rail)u.searchParams.set('rail',String(options.rail));
    if(options.currency)u.searchParams.set('currency',String(options.currency).toUpperCase());
    if(options.asset)u.searchParams.set('asset',String(options.asset).toUpperCase());
    if(Number.isFinite(options.assetAmount)&&options.assetAmount>0)u.searchParams.set('asset_amount',String(options.assetAmount));
    if(options.successUrl)u.searchParams.set('success_url',String(options.successUrl));
    if(options.cancelUrl)u.searchParams.set('cancel_url',String(options.cancelUrl));
    return u.toString();
  }
  function redirect(options){global.location.assign(url(options));}
  function result(search){
    const p=new URLSearchParams(search||global.location.search);
    const state=p.get('settlement_state');
    if(!state)return null;
    return Object.freeze({
      checkout:p.get('neo_checkout'),
      paymentId:p.get('payment_id'),
      state,
      confirmed:p.get('settlement_confirmed')==='1',
      reference:p.get('reference')||null,
      fulfillmentEligible:state==='SETTLED'&&p.get('settlement_confirmed')==='1'&&Boolean(p.get('reference'))
    });
  }
  global.NEOCheckout=Object.freeze({version:'1.2.0',url,redirect,result,currencies:'/neo-system/api/neo-counter/currencies.json'});
})(window);
