import {createHash, createHmac, timingSafeEqual} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync, chmodSync} from 'node:fs';
import {dirname} from 'node:path';
import {createNiceHashReadOnlyClient} from './nicehashReadOnly.mjs';

export const SANDBOX_BOUNDARY = Object.freeze({
  gate: 'NEO-CLOUD-002', environment: 'sandbox',
  purchasesEnabled: false, contractActivationEnabled: false,
  tokenIssuanceEnabled: false, mainnetSettlementEnabled: false
});
const HEX64 = /^[a-f0-9]{64}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}$/;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const EXPLORER = 'https://blockstream.info/testnet/api'; // Bitcoin testnet3, not mainnet or testnet4.
const DOMAIN = 'neo-counter.sandbox.receipt.v1\0';
const fail = code => { throw new Error(code); };
const digest = text => createHash('sha256').update(text).digest('hex');
const plain = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const integer = (x, min, max) => Number.isSafeInteger(x) && x >= min && x <= max;
const timestamp = x => {
  if (typeof x !== 'string' || !ISO.test(x) || !Number.isFinite(Date.parse(x)) || new Date(x).toISOString() !== x) fail('SANDBOX_TIMESTAMP_INVALID');
  return Date.parse(x);
};

/** Safe operator diagnostic. A public API response is never account authentication. */
export async function probeSandboxProvider({env = process.env, fetchImpl = fetch, now = Date.now} = {}) {
  const result = {...SANDBOX_BOUNDARY, provider: 'NICEHASH', network: 'testnet',
    authenticated: false, selectedOrderObserved: false, orderStatisticsRead: false,
    acceptedShares: null, btcReceived: null, status: 'SANDBOX_DISABLED'};
  if (env.NEO_CLOUD_SANDBOX_ENABLED !== 'true') return result;
  const required = ['NICEHASH_TEST_API_KEY', 'NICEHASH_TEST_API_SECRET', 'NICEHASH_TEST_ORGANIZATION_ID'];
  const missing = required.filter(name => typeof env[name] !== 'string' || !env[name].trim());
  if (missing.length) return {...result, status: 'TEST_CREDENTIALS_NOT_CONFIGURED', missing};
  try {
    const client = createNiceHashReadOnlyClient({network: 'testnet', key: env.NICEHASH_TEST_API_KEY,
      secret: env.NICEHASH_TEST_API_SECRET, organizationId: env.NICEHASH_TEST_ORGANIZATION_ID, fetchImpl, now});
    const response = await client.myOrders();
    // Unknown API shapes and error objects must not turn the status green.
    if (!plain(response.data) || !Array.isArray(response.data.list) || response.data.list.length > 1000 ||
        response.data.list.some(row => !plain(row) || typeof row.id !== 'string' || !UUID.test(row.id))) fail('TEST_ORDER_LIST_INVALID');
    result.authenticated = true;
    result.observedAt = new Date(now()).toISOString();
    const id = env.NICEHASH_TEST_ORDER_ID;
    if (!id) return {...result, status: 'TEST_ACCOUNT_READ_VERIFIED_ORDER_NOT_SELECTED'};
    if (!UUID.test(id)) return {...result, status: 'TEST_ORDER_ID_INVALID'};
    const matches = response.data.list.filter(row => row.id.toLowerCase() === id.toLowerCase());
    if (matches.length !== 1) return {...result, status: 'TEST_ORDER_NOT_UNIQUE_ON_RETURNED_PAGE'};
    const row = matches[0];
    const algorithm = typeof row.algorithm === 'string' ? row.algorithm : row.algorithm?.algorithm;
    if (!['SHA256', 'SHA256ASICBOOST'].includes(algorithm)) return {...result, status: 'TEST_ORDER_NOT_BITCOIN_HASHPOWER'};
    result.selectedOrderObserved = true;
    const stats = await client.orderStatistics(id);
    if (!plain(stats.data) || stats.data.error || stats.data.errors) fail('TEST_ORDER_STATS_INVALID');
    return {...result, orderStatisticsRead: true, status: 'TEST_ACCOUNT_AND_ORDER_READ_VERIFIED'};
  } catch {
    // Never include upstream response bodies, account IDs, order IDs, or exceptions.
    return {...result, status: 'TEST_PROVIDER_READ_FAILED'};
  }
}

export function sandboxReadAuthorized(header, token) {
  if (typeof token !== 'string' || !HEX64.test(token) || typeof header !== 'string') return false;
  const actual = Buffer.from(header), expected = Buffer.from(`Bearer ${token}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Orders originate in a trusted server store, NEVER from a browser return or local draft. */
export function validateSandboxOrder(order, nowMs = Date.now()) {
  if (!Number.isFinite(nowMs) || !plain(order) || order.environment !== 'sandbox' ||
      order.network !== 'testnet3' || order.currency !== 'BTC_TESTNET' || order.service !== 'neo-miner' ||
      order.provider !== 'NICEHASH_TESTNET' || typeof order.providerOrderId !== 'string' || !UUID.test(order.providerOrderId)) fail('SANDBOX_ORDER_BOUNDARY_INVALID');
  for (const field of ['orderId', 'merchantId', 'customerId']) if (typeof order[field] !== 'string' || !ID.test(order[field])) fail('SANDBOX_ORDER_ID_INVALID');
  if (!integer(order.amountSats, 1, 2100000000000000) || !integer(order.minConfirmations, 1, 144)) fail('SANDBOX_ORDER_AMOUNT_OR_CONFIRMATIONS_INVALID');
  if (typeof order.scriptPubKey !== 'string' || !/^(?:[a-f0-9]{2}){2,10000}$/.test(order.scriptPubKey)) fail('SANDBOX_ORDER_DESTINATION_INVALID');
  const created = timestamp(order.createdAt), expires = timestamp(order.expiresAt);
  if (created > nowMs + 5000 || expires <= nowMs || expires <= created || expires - created > 86400000) fail('SANDBOX_ORDER_EXPIRED_OR_FUTURE');
  // Fixed order prevents JSON property order from changing the digest.
  return Object.freeze(Object.fromEntries(['environment', 'network', 'currency', 'service', 'provider', 'providerOrderId', 'orderId', 'merchantId',
    'customerId', 'amountSats', 'minConfirmations', 'scriptPubKey', 'createdAt', 'expiresAt'].map(key => [key, order[key]])));
}

export function sandboxOrderDigest(order, nowMs = Date.now()) {
  return digest(JSON.stringify(validateSandboxOrder(order, nowMs)));
}

/** Counter's separately provisioned key authenticates exact bytes, including the order digest. */
export function authenticateCounterReceipt({rawBody, signature, secret, order, nowMs = Date.now()}) {
  const expectedOrder = validateSandboxOrder(order, nowMs);
  if (typeof rawBody !== 'string' || Buffer.byteLength(rawBody) > 16384 ||
      typeof secret !== 'string' || Buffer.byteLength(secret) < 32 ||
      typeof signature !== 'string' || !/^sha256=[a-f0-9]{64}$/.test(signature)) fail('COUNTER_RECEIPT_AUTH_REQUIRED');
  const expected = createHmac('sha256', secret).update(DOMAIN).update(rawBody).digest();
  if (!timingSafeEqual(expected, Buffer.from(signature.slice(7), 'hex'))) fail('COUNTER_RECEIPT_SIGNATURE_INVALID');
  let receipt;
  try { receipt = JSON.parse(rawBody); } catch { fail('COUNTER_RECEIPT_JSON_INVALID'); }
  if (!plain(receipt) || receipt.schema !== 'neo.counter.sandbox-payment.v1' || receipt.issuer !== 'NEO_COUNTER') fail('COUNTER_RECEIPT_SCHEMA_INVALID');
  for (const field of ['environment', 'network', 'currency', 'service', 'orderId', 'merchantId', 'customerId', 'amountSats']) {
    if (receipt[field] !== expectedOrder[field]) fail('COUNTER_RECEIPT_ORDER_MISMATCH');
  }
  if (receipt.orderDigest !== digest(JSON.stringify(expectedOrder))) fail('COUNTER_RECEIPT_ORDER_DIGEST_MISMATCH');
  if (typeof receipt.receiptId !== 'string' || !ID.test(receipt.receiptId) ||
      typeof receipt.txid !== 'string' || !HEX64.test(receipt.txid) || !integer(receipt.vout, 0, 100000)) fail('COUNTER_RECEIPT_REFERENCE_INVALID');
  const issued = timestamp(receipt.issuedAt);
  if (issued < nowMs - 300000 || issued > nowMs + 5000 || issued < Date.parse(order.createdAt)) fail('COUNTER_RECEIPT_STALE_OR_FUTURE');
  return {receipt, order: expectedOrder, bodyDigest: digest(rawBody)};
}

async function readExplorer(path, fetchImpl, json = true) {
  if (!/^\/(tx\/[a-f0-9]{64}(\/status)?|blocks\/tip\/height|block-height\/\d+)$/.test(path)) fail('EXPLORER_PATH_DENIED');
  const response = await fetchImpl(EXPLORER + path, {method: 'GET', redirect: 'error',
    headers: {accept: json ? 'application/json' : 'text/plain'}, signal: AbortSignal.timeout(8000)});
  if (!response.ok) fail('TESTNET_OBSERVER_UNAVAILABLE');
  if (Number(response.headers.get('content-length')) > 2000000) fail('TESTNET_RESPONSE_TOO_LARGE');
  // Bound the stream even if the peer omits or lies about Content-Length.
  if (!response.body) fail('TESTNET_RESPONSE_EMPTY');
  const reader = response.body.getReader();
  const chunks = []; let size = 0;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2000000) { await reader.cancel(); fail('TESTNET_RESPONSE_TOO_LARGE'); }
      chunks.push(Buffer.from(value));
    }
  } finally { reader.releaseLock(); }
  const text = Buffer.concat(chunks).toString('utf8');
  if (!json) return text.trim();
  try { return JSON.parse(text); } catch { fail('TESTNET_RESPONSE_INVALID'); }
}

/** Single-host sandbox audit ledger. It never credits a wallet or activates a contract. */
export class SandboxEvidenceLedger {
  constructor(path) {
    if (typeof path !== 'string' || !path) fail('SANDBOX_LEDGER_PATH_REQUIRED');
    this.durable = path !== ':memory:';
    if (this.durable) mkdirSync(dirname(path), {recursive: true, mode: 0o700});
    this.db = new DatabaseSync(path);
    if (this.durable) chmodSync(path, 0o600);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS sandbox_payment_evidence (
        order_id TEXT PRIMARY KEY, receipt_id TEXT UNIQUE NOT NULL, outpoint TEXT UNIQUE NOT NULL,
        order_digest TEXT NOT NULL, body_digest TEXT NOT NULL, block_hash TEXT NOT NULL, verified_at TEXT NOT NULL
      );`);
  }
  claim({receipt, bodyDigest, blockHash, verifiedAt}) {
    const outpoint = `testnet3:${receipt.txid}:${receipt.vout}`;
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const old = this.db.prepare('SELECT * FROM sandbox_payment_evidence WHERE order_id=? OR receipt_id=? OR outpoint=?')
        .all(receipt.orderId, receipt.receiptId, outpoint);
      if (old.length) {
        const same = old.length === 1 && old[0].order_id === receipt.orderId && old[0].receipt_id === receipt.receiptId &&
          old[0].outpoint === outpoint && old[0].order_digest === receipt.orderDigest && old[0].body_digest === bodyDigest;
        if (!same) fail('SANDBOX_RECEIPT_OR_OUTPOINT_ALREADY_BOUND');
        this.db.exec('COMMIT'); return {replayed: true};
      }
      this.db.prepare('INSERT INTO sandbox_payment_evidence VALUES (?,?,?,?,?,?,?)')
        .run(receipt.orderId, receipt.receiptId, outpoint, receipt.orderDigest, bodyDigest, blockHash, verifiedAt);
      this.db.exec('COMMIT'); return {replayed: false};
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  close() { this.db.close(); }
}

/** Independently observes a Counter-asserted TESTNET transfer. Not a consensus/SPV proof. */
export async function verifySandboxPayment({rawBody, signature, secret, order, ledger, fetchImpl = fetch, now = Date.now}) {
  const checked = authenticateCounterReceipt({rawBody, signature, secret, order, nowMs: now()});
  if (!(ledger instanceof SandboxEvidenceLedger)) fail('SANDBOX_LEDGER_REQUIRED');
  const {receipt} = checked;
  const tx = await readExplorer(`/tx/${receipt.txid}`, fetchImpl);
  const status = tx?.status;
  if (tx?.txid !== receipt.txid || !Array.isArray(tx.vout) || !Array.isArray(tx.vin) || !tx.vin.length ||
      tx.vin.some(input => !plain(input) || input.is_coinbase !== false)) fail('TESTNET_TRANSACTION_INVALID');
  const output = tx.vout[receipt.vout];
  if (!plain(output) || output.scriptpubkey !== checked.order.scriptPubKey ||
      !integer(output.value, 1, 2100000000000000) || output.value !== checked.order.amountSats) fail('TESTNET_DESTINATION_OR_AMOUNT_MISMATCH');
  if (status?.confirmed !== true || !integer(status.block_height, 1, 100000000) ||
      typeof status.block_hash !== 'string' || !HEX64.test(status.block_hash)) fail('TESTNET_PAYMENT_NOT_CONFIRMED');
  const tipText = await readExplorer('/blocks/tip/height', fetchImpl, false);
  if (!/^\d{1,9}$/.test(tipText)) fail('TESTNET_TIP_INVALID');
  const confirmations = Number(tipText) - status.block_height + 1;
  if (confirmations < checked.order.minConfirmations) fail('TESTNET_CONFIRMATIONS_INSUFFICIENT');
  const canonicalHash = await readExplorer(`/block-height/${status.block_height}`, fetchImpl, false);
  const latest = await readExplorer(`/tx/${receipt.txid}/status`, fetchImpl);
  if (canonicalHash !== status.block_hash || latest?.confirmed !== true || latest.block_hash !== canonicalHash ||
      latest.block_height !== status.block_height) fail('TESTNET_REORG_OR_INCONSISTENT_OBSERVATION');
  // Recheck freshness AFTER network IO; cache/replay cannot preserve expired success.
  authenticateCounterReceipt({rawBody, signature, secret, order, nowMs: now()});
  const verifiedAt = new Date(now()).toISOString();
  const claim = ledger.claim({...checked, blockHash: canonicalHash, verifiedAt});
  return {...SANDBOX_BOUNDARY, paymentVerified: true, network: 'testnet3',
    evidenceClass: 'COUNTER_AUTHENTICATED_EXPLORER_OBSERVED_TEST_PAYMENT',
    status: 'SANDBOX_PAYMENT_VERIFIED_ONLY', confirmations, verifiedAt,
    replayed: claim.replayed, durableReplayProtection: ledger.durable};
}
