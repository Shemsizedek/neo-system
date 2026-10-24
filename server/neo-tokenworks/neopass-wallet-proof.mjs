import { randomBytes, randomUUID } from 'node:crypto';

// Isolated sandbox boundary. No HTTP route, wallet unlock, or transaction signing.
// Production requires an atomic durable store and a reviewed Bitcoin verifier.
export function createNeopassWalletProof({ origin, verifySignature, store, now = Date.now } = {}) {
  const site = new URL(origin);
  if (site.protocol !== 'https:' || site.origin !== origin) throw Error('https_origin_required');
  const records = new Map();
  if (store && (typeof store.insert !== 'function' || typeof store.consumeAtomic !== 'function')) throw Error('atomic_wallet_store_required');
  const text = value => typeof value === 'string' && value.length > 0 && value.length <= 256 && !/[\r\n\x00-\x1f]/.test(value);
  function issue({ subject, sessionId, address, network }) {
    if (![subject, sessionId, address].every(text) || !['bitcoin-mainnet', 'bitcoin-testnet', 'bitcoin-regtest'].includes(network)) throw Error('invalid_wallet_binding');
    if (!store && records.size >= 1000) {
      for (const [id, row] of records) if (row.expiresAt <= now()) records.delete(id);
      if (records.size >= 1000) throw Error('challenge_capacity_reached');
    }
    const row = { id: randomUUID(), subject, sessionId, address, network, origin, nonce: randomBytes(32).toString('hex'), expiresAt: now() + 300000, state: 'pending' };
    row.message = ['NEOpass wallet ownership proof v1', `Origin: ${origin}`, `Network: ${network}`, `Address: ${address}`, `Challenge: ${row.id}`, `Nonce: ${row.nonce}`, `Expires: ${new Date(row.expiresAt).toISOString()}`, 'Purpose: link wallet only; no payment or asset transfer.'].join('\n');
    if (store) store.insert(row); else records.set(row.id, row);
    return { id: row.id, message: row.message, expiresAt: row.expiresAt };
  }
  async function verify({ id, subject, sessionId, signature }) {
    if (![id, subject, sessionId].every(text) || typeof signature !== 'string' || !signature.length || signature.length > 16384 || typeof verifySignature !== 'function') return null;
    let row;
    try {
      row = store ? store.consumeAtomic({ id, subject, sessionId, origin, now: now() }) : records.get(id);
    } catch { return null; }
    if (!row || row.state !== 'pending' || row.expiresAt <= now() || row.subject !== subject || row.sessionId !== sessionId || typeof signature !== 'string' || !signature.length || signature.length > 16384) return null;
    // Consume before awaiting to prevent concurrent verification of the same nonce.
    row.state = 'consumed';
    try {
      if (await verifySignature({ address: row.address, network: row.network, message: row.message, signature }) !== true || row.expiresAt <= now()) return null;
      return Object.freeze({ subject: row.subject, address: row.address, network: row.network, origin, challengeId: row.id, verifiedAt: now(), purpose: 'wallet-link' });
    } catch { return null; }
  }
  return Object.freeze({ issue, verify });
}
