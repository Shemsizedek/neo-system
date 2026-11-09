import test from 'node:test';
import assert from 'node:assert/strict';
import { checkoutModel, qrSvg, mountMerchantCheckout } from './merchant-checkout.mjs';
// BIP21's intentionally invalid example address prevents accidental demo payments.
const destination = '175tWpb8K1S7NmH4Zx6rewF9WQrcZv245W';
const now = 1794096000000;
const fixture = () => ({ state: 'AWAITING_PAYMENT', payable: true, invoice: { order_id: 1, merchant_name: 'Demo merchant', item_reference: 'Service invoice', currency_asset: 'NOMNI', currency_decimals: 8, amount_minor: '1250000000', destination, ledger: 'cp20', expires_at: now / 1000 + 60, payable: true, terms_accepted: true } });
test('token checkout displays exact asset and quantity; QR never encodes token units as BTC', () => {
  const row = fixture(), m = checkoutModel(row, now);
  assert.equal(m.amount, '12.5'); assert.equal(m.asset, 'NOMNI'); assert.equal(m.destination, destination);
  assert.equal(m.qrPayload, destination); assert.doesNotMatch(m.qrPayload, /bitcoin:|amount=|https:/);
  assert.match(m.qrNote, /Address-only QR/); assert.match(m.qrNote, /Do not send BTC/);
  row.invoice.currency_asset = 'BTC';
  assert.equal(checkoutModel(row, now).qrPayload, `bitcoin:${destination}?amount=12.5`);
});
test('indivisible World Currency invoices keep exact units and asset identity', () => {
  const row = fixture(); Object.assign(row.invoice, { currency_asset: 'NEOCASH', currency_symbol: 'USD', currency_decimals: 0, amount_minor: '1234567890123456789' });
  const m = checkoutModel(row, now); assert.equal(m.amount, '1234567890123456789'); assert.equal(m.asset, 'NEOCASH');
});
test('locked, expired, pending and paid invoices cannot expose payment QR instructions', () => {
  for (const state of ['LOCKED_NOT_PAYABLE', 'PREPARED_NOT_PAYABLE', 'PAYMENT_DETECTED', 'TOKEN_UNCONFIRMED', 'PAYMENT_CONFIRMED', 'PAYMENT_RECHECK_REQUIRED', 'unknown']) {
    const row = fixture(); row.state = state;
    const m = checkoutModel(row, now); assert.equal(m.ready, false, state); assert.equal(m.qrPayload, null);
    if (state === 'PAYMENT_CONFIRMED') assert.match(m.statusNote, /Delivery.*separately/);
  }
  for (const change of [row => row.payable = false, row => row.invoice.payable = false, row => row.invoice.terms_accepted = false, row => row.invoice.expires_at = now / 1000]) {
    const row = fixture(); change(row); assert.equal(checkoutModel(row, now).qrPayload, null);
  }
});
test('invalid precision, amounts, assets and destinations fail without guessing a payment', () => {
  for (const patch of [{ amount_minor: '1e8' }, { amount_minor: '0' }, { amount_minor: '-1' }, { currency_decimals: 2 }, { destination: 'javascript:alert(1)' }, { currency_asset: '<BTC>' }, { ledger: 'any' }]) {
    const row = fixture(); Object.assign(row.invoice, patch); assert.throws(() => checkoutModel(row, now));
  }
});
test('QR is generated locally as SVG with a four-module quiet zone and no external image requests', () => {
  const svg = qrSvg(destination); assert.match(svg, /<svg/); assert.match(svg, /fill="white"/); assert.match(svg, /shape-rendering="crispEdges"/);
  assert.doesNotMatch(svg, /<image|href=|<script/);
});
test('copy reflects the authoritative merchant wallet and failure is clear; URL success never marks paid', async () => {
  const nodes = new Map();
  const root = { dataset: {}, set innerHTML(value) { this.template = value; }, querySelector(selector) { if (!nodes.has(selector)) nodes.set(selector, { textContent: '', innerHTML: '', dataset: {}, addEventListener(name, callback) { this[name] = callback; } }); return nodes.get(selector); } };
  let copied;
  const stop = mountMerchantCheckout(root, fixture(), { now: () => now, clipboard: { writeText: async value => { copied = value; } } });
  try { await nodes.get('[data-copy]').click(); assert.equal(copied, destination); assert.equal(nodes.get('[data-state]').textContent, 'Awaiting payment'); assert.equal(nodes.get('[data-merchant]').textContent, 'Demo merchant'); }
  finally { stop(); }
});
