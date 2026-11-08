// Internal server API. The verifier must be supplied by trusted server code,
// never selected from HTTP input or replaced by browser-return evidence.
export class PaymentAllocationError extends Error {
  constructor(code) { super(code); this.code = code; }
}
const fail = code => { throw new PaymentAllocationError(code); };
const text = value => typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= 255;
const hash = value => typeof value === 'string' && /^[a-fA-F0-9]{64}$/.test(value);
const amount = value => typeof value === 'string' && /^[1-9][0-9]{0,77}$/.test(value);
const instant = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;

export function createPaymentAllocationStore(db, { verifyPayment, now = () => new Date() } = {}) {
  if (typeof verifyPayment !== 'function') fail('trusted_payment_verifier_required');
  db.exec(`
    CREATE TABLE IF NOT EXISTS payment_orders (
      merchant_id TEXT NOT NULL, order_id TEXT NOT NULL, order_json TEXT NOT NULL,
      PRIMARY KEY (merchant_id, order_id)
    );
    CREATE TABLE IF NOT EXISTS payment_allocations (
      network TEXT NOT NULL, rail TEXT NOT NULL, txid TEXT NOT NULL, event_index INTEGER NOT NULL,
      merchant_id TEXT NOT NULL, order_id TEXT NOT NULL, allocation_json TEXT NOT NULL,
      PRIMARY KEY (network, rail, txid, event_index),
      UNIQUE (merchant_id, order_id),
      FOREIGN KEY (merchant_id, order_id) REFERENCES payment_orders(merchant_id, order_id)
    );
  `);
  const getOrder = (merchantId, orderId) => {
    const row = db.prepare('SELECT order_json FROM payment_orders WHERE merchant_id=? AND order_id=?').get(merchantId, orderId);
    return row ? JSON.parse(row.order_json) : null;
  };

  // Call only with the merchant's server-authoritative order and destination.
  function registerOrder(input) {
    if (!input || !['merchantId', 'orderId', 'asset', 'destination'].every(key => text(input[key])) ||
        !['bitcoin-mainnet', 'bitcoin-testnet', 'bitcoin-regtest'].includes(input.network) ||
        !['BTC', 'COUNTERPARTY'].includes(input.rail) || (input.rail === 'BTC' && input.asset !== 'BTC') ||
        !amount(input.amountAtomic) || !Number.isSafeInteger(input.minConfirmations) || input.minConfirmations < 1 ||
        !instant(input.expiresAt)) fail('invalid_payment_order');
    const order = Object.fromEntries(['merchantId', 'orderId', 'network', 'rail', 'asset', 'destination', 'amountAtomic', 'minConfirmations', 'expiresAt'].map(key => [key, input[key]]));
    db.exec('BEGIN IMMEDIATE');
    try {
      const existing = getOrder(order.merchantId, order.orderId);
      if (existing) {
        if (Object.keys(order).some(key => order[key] !== existing[key])) fail('payment_order_conflict');
        db.exec('COMMIT');
        return existing;
      }
      if (Date.parse(order.expiresAt) <= now().getTime()) fail('payment_order_expired');
      order.createdAt = now().toISOString();
      db.prepare('INSERT INTO payment_orders VALUES (?,?,?)').run(order.merchantId, order.orderId, JSON.stringify(order));
      db.exec('COMMIT');
      return order;
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  }

  async function allocate({ merchantId, orderId, txid, eventIndex } = {}) {
    if (!text(merchantId) || !text(orderId) || !hash(txid) || !Number.isSafeInteger(eventIndex) || eventIndex < 0) fail('invalid_payment_reference');
    const order = getOrder(merchantId, orderId);
    if (!order) fail('payment_order_not_found');
    const reference = Object.freeze({ txid: txid.toLowerCase(), eventIndex });
    // Always reverify, including retries. This permits a verifier to reject reorgs.
    const evidence = await verifyPayment(Object.freeze({ ...order }), reference);
    if (!evidence || evidence.confirmed !== true || !hash(evidence.blockHash) || !hash(evidence.txid) ||
        evidence.txid?.toLowerCase() !== reference.txid || evidence.eventIndex !== eventIndex ||
        ['network', 'rail', 'asset', 'destination'].some(key => evidence[key] !== order[key]) ||
        !amount(evidence.amountAtomic) || BigInt(evidence.amountAtomic) < BigInt(order.amountAtomic) ||
        !Number.isSafeInteger(evidence.confirmations) || evidence.confirmations < order.minConfirmations ||
        !instant(evidence.blockTime) || Date.parse(evidence.blockTime) < Date.parse(order.createdAt) ||
        Date.parse(evidence.blockTime) > now().getTime() || Date.parse(evidence.blockTime) > Date.parse(order.expiresAt)) fail('payment_evidence_rejected');

    db.exec('BEGIN IMMEDIATE');
    try {
      const claimed = db.prepare('SELECT merchant_id, order_id, allocation_json FROM payment_allocations WHERE network=? AND rail=? AND txid=? AND event_index=?')
        .get(order.network, order.rail, reference.txid, eventIndex);
      if (claimed) {
        if (claimed.merchant_id !== merchantId || claimed.order_id !== orderId) fail('payment_already_allocated');
        const previous = JSON.parse(claimed.allocation_json);
        if (previous.blockHash !== evidence.blockHash.toLowerCase() || previous.amountAtomic !== evidence.amountAtomic) fail('payment_evidence_changed');
        db.exec('COMMIT');
        return previous;
      }
      const previous = db.prepare('SELECT 1 FROM payment_allocations WHERE merchant_id=? AND order_id=?').get(merchantId, orderId);
      if (previous) fail('order_already_allocated');
      // Reject new allocations after expiry, including a quote expiring during verification.
      if (now().getTime() >= Date.parse(order.expiresAt)) fail('payment_order_expired');
      const allocation = { merchantId, orderId, network: order.network, rail: order.rail, ...reference,
        asset: order.asset, destination: order.destination, amountAtomic: evidence.amountAtomic,
        blockHash: evidence.blockHash.toLowerCase(), allocatedAt: now().toISOString() };
      db.prepare('INSERT INTO payment_allocations VALUES (?,?,?,?,?,?,?)')
        .run(order.network, order.rail, reference.txid, eventIndex, merchantId, orderId, JSON.stringify(allocation));
      db.exec('COMMIT');
      return allocation;
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  }
  return { registerOrder, allocate };
}
