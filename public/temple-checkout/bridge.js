(function(global){
  const ENGINE='https://shemsizedek.github.io/neo-system/neo-counter/';
  const OFFICIAL='https://holytemples.org/checkout/';
  function cleanReturn(value){
    if(!value)return undefined;
    try{
      const u=new URL(value,global.location.origin);
      if(u.protocol!=='https:')return undefined;
      return u.toString();
    }catch{return undefined;}
  }
  function checkout(options={}){
    const amountCents=Number(options.amountCents);
    if(!Number.isSafeInteger(amountCents)||amountCents<=0)throw new Error('amountCents must be a positive integer');
    const u=new URL(ENGINE);
    u.searchParams.set('checkout','1');
    u.searchParams.set('service',String(options.service||'world-temple'));
    u.searchParams.set('order',String(options.orderId||('temple_'+crypto.randomUUID())));
    u.searchParams.set('label',String(options.label||'World Temple Checkout'));
    u.searchParams.set('amount',String(amountCents));
    if(options.currency)u.searchParams.set('currency',String(options.currency).toUpperCase());
    if(options.asset)u.searchParams.set('asset',String(options.asset).toUpperCase());
    if(Number(options.assetAmount)>0)u.searchParams.set('asset_amount',String(options.assetAmount));
    if(options.rail)u.searchParams.set('rail',String(options.rail));
    const success=cleanReturn(options.successUrl||global.location.href);
    const cancel=cleanReturn(options.cancelUrl||global.location.href);
    if(success)u.searchParams.set('success_url',success);
    if(cancel)u.searchParams.set('cancel_url',cancel);
    u.searchParams.set('checkout_origin',OFFICIAL);
    return u.toString();
  }
  function redirect(options){global.location.assign(checkout(options));}
  global.NEOTempleCheckout=Object.freeze({version:'1.0.0',officialCheckout:OFFICIAL,engine:ENGINE,checkout,redirect});
})(window);
