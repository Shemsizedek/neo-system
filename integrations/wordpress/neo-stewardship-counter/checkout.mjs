import { quoteStewardship } from './pricing.mjs';
export function mountStewardship(root, references = {}, clock = Date.now, schedule = setTimeout, unschedule = clearTimeout) {
 const form = root.querySelector('[data-quote-form]');
 let timer;
 const put = (selector, value) => { const el = root.querySelector(selector); if (el) el.textContent = value; };
 const money = (v,c) => { const n = c === 'USD' ? 2 : 8; const s = String(v).padStart(n+1,'0'); return s.slice(0,-n)+'.'+s.slice(-n)+' '+c; };
 const update = () => {
  if (timer !== undefined) unschedule(timer);
  const asset = form.elements.purpose.value === 'adept' ? 'TEMPLEBOND' : 'PLEDGEBOND';
  const qty = form.elements.quantity.value;
  const a = root.querySelector('[data-order-asset]'), q = root.querySelector('[data-order-quantity]');
  if (a) a.value = asset;
  if (q) q.value = qty;
  try {
   const quote = quoteStewardship({...references[asset], asset, quantity:qty},clock());
   put('[data-total]',money(quote.totalMinor,quote.currency));
   put('[data-subtotal]',money(quote.marketSubtotalMinor,quote.currency));
   put('[data-fees]',money(String(BigInt(quote.totalMinor)-BigInt(quote.marketSubtotalMinor)),quote.currency));
   put('[data-price-status]','Estimate includes fees.');
   timer = schedule(() => { put('[data-total]','—'); put('[data-price-status]','Estimate expired. Refresh for current pricing.'); put('[data-subtotal]','—'); put('[data-fees]','—'); },quote.expiresAt-clock());
  } catch {
   put('[data-total]','—'); put('[data-subtotal]','—'); put('[data-fees]','—');
   put('[data-price-status]', !form.elements.quantity.validity.valid ? 'Enter a whole quantity from 1 to 999,999.' : root.getAttribute('data-currency') !== 'btc' ? 'This currency is not available for checkout yet.' : !root.getAttribute('data-selected-ledger') ? 'Choose your wallet version in settings to see pricing.' : 'Pricing is unavailable for this selection. Please try again later.');
  }
 };
 form.addEventListener('input',update);
 form.addEventListener('change',update);
 form.addEventListener('submit',event=>event.preventDefault());
 update();
}
