import { qrcodegen } from './vendor/qrcodegen.mjs';

export function checkoutModel(row, now = Date.now()) {
  const p = row?.invoice;
  if (!p || !/^[1-9][0-9]{0,18}$/.test(p.amount_minor) || ![0, 8].includes(p.currency_decimals) ||
      typeof p.currency_asset !== 'string' || !/^[A-Z0-9._-]{1,128}$/.test(p.currency_asset) ||
      !['classic', 'cp20'].includes(p.ledger) || typeof p.destination !== 'string' || !/^1[1-9A-HJ-NP-Za-km-z]{25,34}$/.test(p.destination)) throw new Error('Checkout details are unavailable. Contact the merchant.');
  const units = p.amount_minor.padStart(p.currency_decimals + 1, '0');
  const amount = p.currency_decimals ? `${units.slice(0, -8)}.${units.slice(-8)}`.replace(/\.?0+$/, '') : units;
  const expired = !Number.isSafeInteger(p.expires_at) || now >= p.expires_at * 1000;
  const paid = row.state === 'PAYMENT_CONFIRMED';
  const confirming = ['PAYMENT_DETECTED', 'TOKEN_UNCONFIRMED'].includes(row.state);
  const ready = !expired && row.payable === true && p.payable === true && p.terms_accepted === true && ['AWAITING_PAYMENT', 'PAYMENT_PENDING'].includes(row.state);
  const state = paid ? 'Paid' : confirming ? 'Confirming payment' : expired ? 'Expired' : ready ? 'Awaiting payment' : 'Not ready for payment';
  return Object.freeze({ amount, asset: p.currency_asset, destination: p.destination, ready, paid, confirming, state,
    merchant: typeof p.merchant_name === 'string' && p.merchant_name.trim() ? p.merchant_name : 'Merchant',
    reference: String(p.item_reference || `Order ${p.order_id || ''}`),
    network: p.currency_asset === 'BTC' ? 'Bitcoin mainnet' : `Bitcoin · Counterparty ${p.ledger === 'cp20' ? '2.0' : 'Classic'}`,
    qrPayload: ready ? (p.currency_asset === 'BTC' ? `bitcoin:${p.destination}?amount=${amount}` : p.destination) : null,
    qrNote: p.currency_asset === 'BTC' ? 'Scan to open a Bitcoin payment.' : `Address-only QR. Select ${p.currency_asset} in your Counterparty wallet and enter ${amount}. Do not send BTC as the payment.`,
    statusNote: paid ? 'Payment confirmed. Delivery or service completion is tracked separately.' : confirming ? 'Your payment is being confirmed. Do not pay again.' : expired ? 'Ask the merchant for an updated invoice. Do not send payment to this expired request.' : ready ? 'Pay the exact asset and amount below. Your wallet may also require a Bitcoin network fee.' : 'This invoice is not enabled for payment. Contact the merchant. No payment is requested.',
    terms: typeof p.terms_snapshot === 'string' ? p.terms_snapshot : '',
    baseMinor: p.base_minor || null, markupBps: p.markup_bps ?? null,
  });
}

export function qrSvg(text) {
  const code = qrcodegen.QrCode.encodeText(text, qrcodegen.QrCode.Ecc.MEDIUM);
  const cells = [];
  for (let y = 0; y < code.size; y++) for (let x = 0; x < code.size; x++) if (code.getModule(x, y)) cells.push(`M${x + 4},${y + 4}h1v1h-1z`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${code.size + 8} ${code.size + 8}" role="img" aria-label="Merchant payment QR code" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="white"/><path d="${cells.join('')}" fill="black"/></svg>`;
}

export function mountMerchantCheckout(root, initial, { fetchImpl = fetch, now = Date.now, clipboard = globalThis.navigator?.clipboard } = {}) {
  let row = structuredClone(initial), busy = false, lastQr;
  root.innerHTML = `<header class="nc-head"><a class="nc-brand" href="/">NEO <span>COUNTER</span></a><span class="nc-secure">Direct to merchant</span></header><div class="nc-grid"><section class="nc-summary"><p class="nc-eyebrow">YOU ARE PAYING</p><h2 data-merchant></h2><p data-reference class="nc-muted"></p><div class="nc-total"><span data-amount></span><strong data-asset></strong></div><p data-network class="nc-muted"></p><div data-state class="nc-state" role="status" aria-live="polite"></div><p data-status-note class="nc-muted"></p><details class="nc-details"><summary>Order details &amp; terms</summary><p data-fee-note></p><p data-terms class="nc-terms"></p><p>Sending a payment does not confirm delivery. Keep your invoice and transaction ID.</p></details></section><section class="nc-payment"><h3>Scan or copy</h3><div data-qr class="nc-qr"></div><p data-qr-note class="nc-muted"></p><label class="nc-label">Merchant wallet address<input data-address readonly spellcheck="false" aria-label="Merchant wallet address"></label><div class="nc-actions"><button type="button" data-copy>Copy address</button><button type="button" data-copy-amount class="nc-secondary">Copy amount</button></div><p data-copy-status class="nc-muted" role="status" aria-live="polite"></p><button type="button" data-refresh class="nc-refresh">Refresh payment status</button><p class="nc-footer">Your wallet approves the payment. NEO Counter never asks for recovery words or private keys.</p></section></div>`;
  const find = selector => root.querySelector(selector);
  const text = (selector, value) => { find(selector).textContent = value; };
  const draw = () => {
    const m = checkoutModel(row, now());
    text('[data-merchant]', m.merchant); text('[data-reference]', m.reference); text('[data-amount]', m.amount); text('[data-asset]', m.asset);
    text('[data-network]', m.network); text('[data-state]', m.state); text('[data-status-note]', m.statusNote);
    text('[data-qr-note]', m.ready ? m.qrNote : 'Payment instructions appear here when the merchant enables this invoice.');
    text('[data-fee-note]', m.markupBps === null ? 'The displayed amount is the invoice total. Network fees are shown by your wallet.' : `Invoice pricing includes ${Number(m.markupBps) / 100}% markup. The total above is the exact amount due; your wallet shows any network fee separately.`);
    text('[data-terms]', m.terms);
    find('[data-address]').value = m.destination;
    find('[data-copy]').disabled = find('[data-copy-amount]').disabled = !m.ready;
    if (lastQr !== m.qrPayload) {
      find('[data-qr]').innerHTML = m.ready ? qrSvg(m.qrPayload) : '<span>No payment requested</span>';
      lastQr = m.qrPayload;
    }
    find('[data-state]').dataset.state = m.paid ? 'paid' : m.ready ? 'waiting' : 'hold';
    return m;
  };
  const copy = async kind => {
    const m = draw(); if (!m.ready) return;
    try { await clipboard.writeText(kind === 'address' ? m.destination : m.amount); text('[data-copy-status]', kind === 'address' ? 'Address copied.' : 'Exact amount copied.'); }
    catch { text('[data-copy-status]', 'Copy is unavailable. Select and copy the wallet address or amount manually.'); }
  };
  find('[data-copy]').addEventListener('click', () => copy('address'));
  find('[data-copy-amount]').addEventListener('click', () => copy('amount'));
  find('[data-refresh]').addEventListener('click', async () => {
    if (busy || !root.dataset.statusUrl) return;
    busy = true; find('[data-refresh]').disabled = true;
    try {
      const url = new URL(root.dataset.statusUrl, location.origin);
      if (url.origin !== location.origin || !/^\/wp-json\/neo-counter\/v1\/invoices\/[0-9]+$/.test(url.pathname) || url.search || url.hash) throw new Error();
      const response = await fetchImpl(url.href, { method: 'GET', credentials: 'same-origin', cache: 'no-store', headers: { 'X-WP-Nonce': root.dataset.nonce || '' } });
      if (!response.ok) throw new Error();
      const next = await response.json(); checkoutModel(next, now()); row = next; draw();
      text('[data-copy-status]', 'Payment status updated.');
    } catch { text('[data-copy-status]', 'Status is unavailable. Do not pay again; check with the merchant.'); }
    finally { busy = false; find('[data-refresh]').disabled = false; }
  });
  draw();
  const timer = setInterval(() => { try { draw(); } catch {} }, 1000);
  return () => clearInterval(timer);
}

if (typeof document !== 'undefined') for (const root of document.querySelectorAll('[data-neo-merchant-checkout]')) {
  try { const data = root.querySelector('script[type="application/json"]'); mountMerchantCheckout(root, JSON.parse(data.textContent)); }
  catch { root.textContent = 'Checkout details are unavailable. Contact the merchant before sending payment.'; }
}
