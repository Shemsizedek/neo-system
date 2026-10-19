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
 const pricingUrl=root.getAttribute('data-pricing-url');
 if (pricingUrl && globalThis.location && typeof globalThis.fetch==='function') {
  try {
   const url=new URL(pricingUrl);
   if(url.origin===globalThis.location.origin && root.getAttribute('data-selected-ledger')) {
    globalThis.fetch(url.href,{cache:'no-store',credentials:'omit'}).then(r=>{if(!r.ok)throw new Error('Pricing unavailable');return r.json();}).then(data=>{if(data?.references && typeof data.references==='object'){references=data.references;update();}}).catch(()=>{update();});
   }
  } catch {}
 }
}
