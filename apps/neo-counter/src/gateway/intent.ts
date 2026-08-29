import type { Rail } from '../rails/types';
import type { CatalogItem } from '../merchant/types';

export type NeoCheckoutIntent={
  v:'1';
  service:string;
  orderId:string;
  label:string;
  amountCents:number;
  currency:'USD';
  rail?:Rail;
  successUrl?:string;
  cancelUrl?:string;
  metadata?:Record<string,string>;
};

const MAX_LABEL=120;
const MAX_SERVICE=64;
const MAX_ORDER=96;

function safeReturnUrl(value:string|null):string|undefined{
  if(!value)return undefined;
  try{
    const url=new URL(value,window.location.origin);
    if(url.protocol!=='https:' && url.origin!==window.location.origin)return undefined;
    return url.toString();
  }catch{return undefined;}
}

export function readCheckoutIntent(search=window.location.search):NeoCheckoutIntent|null{
  const p=new URLSearchParams(search);
  if(p.get('checkout')!=='1')return null;
  const amountCents=Number.parseInt(p.get('amount')||'',10);
  const service=(p.get('service')||'neo-service').slice(0,MAX_SERVICE);
  const orderId=(p.get('order')||`neo_order_${crypto.randomUUID()}`).slice(0,MAX_ORDER);
  const label=(p.get('label')||service).slice(0,MAX_LABEL);
  const requestedRail=p.get('rail');
  const rail=(['BTC','XCP','NOMNI','USD'] as Rail[]).includes(requestedRail as Rail)?requestedRail as Rail:undefined;
  if(!Number.isSafeInteger(amountCents)||amountCents<=0||amountCents>100_000_000)return null;
  return {
    v:'1',service,orderId,label,amountCents,currency:'USD',rail,
    successUrl:safeReturnUrl(p.get('success_url')),
    cancelUrl:safeReturnUrl(p.get('cancel_url'))
  };
}

export function intentCartItem(intent:NeoCheckoutIntent):CatalogItem{
  return {
    id:`gateway:${intent.service}:${intent.orderId}`,
    name:intent.label,
    price:intent.amountCents,
    category:'NEO Service',
    sku:intent.orderId,
    inventoryTracked:false,
    quantity:1,
    active:true
  };
}

export function checkoutResultUrl(base:string,status:'success'|'cancel',paymentId:string,reference?:string):string{
  const url=new URL(base);
  url.searchParams.set('neo_checkout',status);
  url.searchParams.set('payment_id',paymentId);
  if(reference)url.searchParams.set('reference',reference);
  return url.toString();
}
