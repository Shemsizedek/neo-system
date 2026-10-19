import { quoteStewardship } from './pricing.mjs?ver=0.15.1';
export function mountStewardship(root, references = {}, clock = Date.now, schedule = setTimeout, unschedule = clearTimeout) {
 const form = root.querySelector('[data-quote-form]');
 let timer;
 const put = (selector, value) => { const el = root.querySelector(selector); if (el) el.textContent = value; };
 const money = (v,c,n=8) => { if(n===0)return String(v)+' '+c; const s = String(v).padStart(n+1,'0'); return s.slice(0,-n)+'.'+s.slice(-n)+' '+c; };
 const update = () => {
  if (timer !== undefined) unschedule(timer);
  const asset = form.elements.purpose.value === 'adept' ? 'TEMPLEBOND' : 'PLEDGEBOND';
  const qty = form.elements.quantity.value;
  const a = root.querySelector('[data-order-asset]'), q = root.querySelector('[data-order-quantity]');
  if (a) a.value = asset;
  if (q) q.value = qty;
  try {
   const quote = quoteStewardship({...references[asset], asset, quantity:qty},clock());
   put('[data-total]',money(quote.totalMinor,quote.currency,quote.currencyDecimals));
   put('[data-subtotal]',money(quote.marketSubtotalDisplayMinor || quote.marketSubtotalMinor,quote.currency,quote.marketSubtotalDisplayMinor?8:quote.currencyDecimals));
   put('[data-fees]',money(quote.feesDisplayMinor || String(BigInt(quote.totalMinor)-BigInt(quote.marketSubtotalMinor)),quote.currency,quote.feesDisplayMinor?8:quote.currencyDecimals));
   put('[data-price-status]','Includes 9% · Daily rate '+(quote.valuationDay || ''));
   timer = schedule(() => { put('[data-total]','—'); put('[data-price-status]','Estimate expired. Refresh for current pricing.'); put('[data-subtotal]','—'); put('[data-fees]','—'); },quote.expiresAt-clock());
  } catch {
   put('[data-total]','—'); put('[data-subtotal]','—'); put('[data-fees]','—');
   put('[data-price-status]', !form.elements.quantity.validity.valid ? 'Enter a whole quantity from 1 to 999,999.' : !root.getAttribute('data-selected-ledger') ? 'Choose your wallet version in settings to see pricing.' : 'No verified daily rate is available for this currency yet.');
  }
 };
 form.addEventListener('input',update);
 form.addEventListener('change',update);
 form.addEventListener('submit',event=>event.preventDefault());
 update();
 const settings=root.querySelector('[data-estimate-settings]');
 let requestId=0;
 const fetchPricing=async (ledger,currency,manual=false)=>{
  const pricingUrl=root.getAttribute('data-pricing-url');
  if(!pricingUrl||!globalThis.location||typeof globalThis.fetch!=='function')return;
  const url=new URL(pricingUrl,globalThis.location.href);if(url.origin!==globalThis.location.origin)return;
  const current=++requestId;const button=settings?.querySelector('[type=submit]');
  if(manual){
   references={};root.setAttribute('data-selected-ledger',ledger);root.setAttribute('data-currency',currency);
   root.setAttribute('data-ledger-explorer',ledger==='classic'?'https://classic.tokenscan.io':'https://cp20.tokenscan.io');
   for(const [name,value] of [['ledger',ledger],['currency',currency]]){const el=root.querySelector('[data-order-'+name+']');if(el)el.value=value;}
   if(typeof root.dispatchEvent==='function'&&typeof CustomEvent==='function')root.dispatchEvent(new CustomEvent('neo:context-change'));
   update();put('[data-price-status]','Updating estimate…');if(button)button.disabled=true;
  }
  url.searchParams.set('ledger',ledger);url.searchParams.set('currency',currency);url.searchParams.set('v','0.21.0');
  try{
   const response=await globalThis.fetch(url.href,{cache:'no-store',credentials:'omit'});if(!response.ok)throw new Error('Pricing unavailable');const data=await response.json();
   if(current!==requestId)return;if(!data?.references||typeof data.references!=='object'||Array.isArray(data.references))throw new Error('Invalid pricing');
   references=data.references;update();
   if(manual&&globalThis.history?.replaceState){const page=new URL(globalThis.location.href);page.searchParams.set('neo_ledger',ledger);page.searchParams.set('neo_currency',currency);globalThis.history.replaceState(null,'',page.href);}
  }catch{if(current===requestId){update();if(manual)put('[data-price-status]','Could not update the estimate. Please try again.');}}
  finally{if(current===requestId&&button)button.disabled=false;}
 };
 settings?.addEventListener('submit',event=>{event.preventDefault();const ledger=settings.elements.neo_ledger.value,currency=settings.elements.neo_currency.value;if(!['classic','cp20'].includes(ledger)){put('[data-price-status]','Choose your wallet version.');return;}void fetchPricing(ledger,currency,true);});
 void fetchPricing(root.getAttribute('data-selected-ledger'),root.getAttribute('data-currency'));
 return {update,refresh:(ledger,currency)=>fetchPricing(ledger,currency,true)};
}
