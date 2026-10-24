import {createHash, createHmac, randomUUID} from 'node:crypto';
import {SANDBOX_BOUNDARY, validateSandboxOrder, sandboxOrderDigest,
  authenticateCounterReceipt, sandboxReadAuthorized} from '../miner-generator/cloudSandbox.mjs';

export const CLOUD_RECEIPT_ROUTE = '/sandbox/cloud-miner/receipt-candidate';
const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}$/;
const HEX64 = /^[a-f0-9]{64}$/;
const DOMAIN = 'neo-counter.sandbox.receipt.v1\0';
const fail = code => {throw new Error(code);};
const digest = text => createHash('sha256').update(text).digest('hex');
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);

/** Trusted local provisioning ONLY. No invoice-import route is exposed to terminals.
 * A generic /sync or /events record, browser return or local plan cannot become an invoice.
 * Tables and event writes share Counter's existing SQLite transaction boundary.
 */
export function createSandboxReceiptIssuer(store, {merchantId, secret, now = Date.now} = {}) {
  if (!store?.db || typeof store.appendEvent !== 'function') fail('COUNTER_STORE_REQUIRED');
  if (typeof merchantId !== 'string' || !ID.test(merchantId) || typeof secret !== 'string' ||
      Buffer.byteLength(secret) < 32 || Buffer.byteLength(secret) > 1024) fail('COUNTER_SANDBOX_CONFIG_INVALID');
  const db = store.db;
  db.exec(`CREATE TABLE IF NOT EXISTS cloud_sandbox_invoices (
    order_id TEXT PRIMARY KEY, merchant_id TEXT NOT NULL, order_digest TEXT NOT NULL,
    script_pub_key TEXT UNIQUE NOT NULL, order_json TEXT NOT NULL, created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS cloud_sandbox_candidates (
    order_id TEXT PRIMARY KEY REFERENCES cloud_sandbox_invoices(order_id),
    receipt_id TEXT UNIQUE NOT NULL, outpoint TEXT UNIQUE NOT NULL,
    raw_body TEXT NOT NULL, created_at TEXT NOT NULL
  );`);

  function provisionInvoice(input) {
    const order = validateSandboxOrder(input, now());
    if (order.merchantId !== merchantId) fail('COUNTER_SANDBOX_MERCHANT_MISMATCH');
    // Only witness v0 P2WPKH/P2WSH or v1 P2TR receiving scripts are admitted here.
    // This validates shape, NOT ownership. Authorized operator must verify destination control.
    if (!/^(0014[a-f0-9]{40}|0020[a-f0-9]{64}|5120[a-f0-9]{64})$/.test(order.scriptPubKey)) fail('COUNTER_SANDBOX_RECEIVING_SCRIPT_INVALID');
    const canonical = JSON.stringify(order), orderDigest = sandboxOrderDigest(order, now());
    db.exec('BEGIN IMMEDIATE');
    try {
      const old = db.prepare('SELECT * FROM cloud_sandbox_invoices WHERE order_id=?').get(order.orderId);
      if (old) {
        if (old.order_digest !== orderDigest || old.order_json !== canonical) fail('COUNTER_SANDBOX_INVOICE_IMMUTABLE');
        db.exec('COMMIT'); return {orderId:order.orderId, replayed:true, paymentVerified:false};
      }
      if (db.prepare('SELECT order_id FROM cloud_sandbox_invoices WHERE script_pub_key=?').get(order.scriptPubKey)) fail('COUNTER_SANDBOX_DESTINATION_REUSED');
      db.prepare('INSERT INTO cloud_sandbox_invoices VALUES (?,?,?,?,?,?)')
        .run(order.orderId, merchantId, orderDigest, order.scriptPubKey, canonical, new Date(now()).toISOString());
      store.appendEvent({merchantId, entity:'cloud_sandbox', terminalId:'server-provisioner',
        type:'sandbox.cloud-miner.invoice-provisioned', payload:{orderId:order.orderId, orderDigest, paymentVerified:false}});
      db.exec('COMMIT'); return {orderId:order.orderId, replayed:false, paymentVerified:false};
    } catch (error) {db.exec('ROLLBACK'); throw error;}
  }

  function issueCandidate(request) {
    if (!plain(request) || Object.keys(request).sort().join(',') !== 'orderId,txid,vout' ||
        typeof request.orderId !== 'string' || !ID.test(request.orderId) ||
        typeof request.txid !== 'string' || !HEX64.test(request.txid) ||
        !Number.isSafeInteger(request.vout) || request.vout < 0 || request.vout > 100000) fail('COUNTER_SANDBOX_REQUEST_INVALID');
    db.exec('BEGIN IMMEDIATE');
    try {
      const row = db.prepare('SELECT * FROM cloud_sandbox_invoices WHERE order_id=? AND merchant_id=?').get(request.orderId, merchantId);
      if (!row) fail('COUNTER_SANDBOX_TRUSTED_INVOICE_REQUIRED');
      const order = validateSandboxOrder(JSON.parse(row.order_json), now());
      if (order.merchantId !== merchantId || sandboxOrderDigest(order, now()) !== row.order_digest) fail('COUNTER_SANDBOX_STORED_INVOICE_INVALID');
      const outpoint = `testnet3:${request.txid}:${request.vout}`;
      const old = db.prepare('SELECT * FROM cloud_sandbox_candidates WHERE order_id=? OR outpoint=?').all(order.orderId, outpoint);
      let rawBody, replayed = false;
      if (old.length) {
        if (old.length !== 1 || old[0].order_id !== order.orderId || old[0].outpoint !== outpoint) fail('COUNTER_SANDBOX_REFERENCE_ALREADY_BOUND');
        rawBody = old[0].raw_body; replayed = true;
        if (now() - Date.parse(old[0].created_at) > 300000) fail('COUNTER_SANDBOX_CANDIDATE_EXPIRED_REVIEW_REQUIRED');
      } else {
        const receipt = {schema:'neo.counter.sandbox-payment.v1', issuer:'NEO_COUNTER',
          environment:order.environment, network:order.network, currency:order.currency, service:order.service,
          orderId:order.orderId, merchantId:order.merchantId, customerId:order.customerId, amountSats:order.amountSats,
          orderDigest:row.order_digest, receiptId:`CSR-${randomUUID()}`, txid:request.txid, vout:request.vout,
          issuedAt:new Date(now()).toISOString()};
        rawBody = JSON.stringify(receipt);
        db.prepare('INSERT INTO cloud_sandbox_candidates VALUES (?,?,?,?,?)')
          .run(order.orderId, receipt.receiptId, outpoint, rawBody, receipt.issuedAt);
        store.appendEvent({merchantId, entity:'cloud_sandbox', terminalId:'sandbox-emitter',
          type:'sandbox.cloud-miner.receipt-candidate', payload:{orderId:order.orderId,
            receiptId:receipt.receiptId, bodyDigest:digest(rawBody), paymentVerified:false}});
      }
      const signature = 'sha256=' + createHmac('sha256', secret).update(DOMAIN).update(rawBody).digest('hex');
      authenticateCounterReceipt({rawBody, signature, secret, order, nowMs:now()});
      db.exec('COMMIT');
      return {...SANDBOX_BOUNDARY, status:'SIGNED_TEST_PAYMENT_CANDIDATE_ONLY', candidateEmitted:true,
        paymentVerified:false, independentlyObserved:false, replayed, rawBody, signature};
    } catch (error) {db.exec('ROLLBACK'); throw error;}
  }
  return Object.freeze({provisionInvoice, issueCandidate});
}

function send(res, status, data) {
  res.writeHead(status, {'content-type':'application/json; charset=utf-8', 'cache-control':'no-store',
    'x-content-type-options':'nosniff', 'referrer-policy':'no-referrer'});
  res.end(JSON.stringify(data));
}
async function boundedRequest(req) {
  const chunks = []; let size = 0;
  const deadline=setTimeout(()=>req.destroy(Error('COUNTER_SANDBOX_REQUEST_TIMEOUT')),5000);
  try {
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 4096) fail('COUNTER_SANDBOX_REQUEST_TOO_LARGE');
      chunks.push(chunk);
    }
  } finally {clearTimeout(deadline);}
  try {return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
  catch {fail('COUNTER_SANDBOX_JSON_INVALID');}
}

/** Disabled by default; distinct merchant-scoped service token, never ordinary cashier/admin auth.
 * This issues signed candidates only. The Generator must independently recheck the chain.
 */
export function createSandboxReceiptRoute(store, {env = process.env, now = Date.now} = {}) {
  let issuer;
  return async (req, res) => {
    let url; try {url = new URL(req.url || '/', 'http://counter.local');} catch {return false;}
    if (url.pathname !== CLOUD_RECEIPT_ROUTE) return false;
    const answer = (status, body) => {send(res, status, {...SANDBOX_BOUNDARY, paymentVerified:false, ...body}); return true;};
    if (env.NEO_COUNTER_SANDBOX_ENABLED !== 'true') return answer(404, {error:'NOT_FOUND'});
    if (req.headers.origin !== undefined || req.headers.cookie !== undefined || url.search) return answer(403, {error:'COUNTER_SANDBOX_SERVER_ONLY'});
    if (req.method !== 'POST') {res.setHeader('allow', 'POST'); return answer(405, {error:'METHOD_NOT_ALLOWED'});}
    const token = env.NEO_COUNTER_SANDBOX_EMITTER_TOKEN, secret = env.NEO_COUNTER_SANDBOX_RECEIPT_SECRET;
    if (typeof token !== 'string' || !HEX64.test(token) || typeof secret !== 'string' || Buffer.byteLength(secret) < 32 ||
        Buffer.byteLength(secret) > 1024 || secret === token || !ID.test(env.NEO_COUNTER_SANDBOX_MERCHANT_ID || '')) return answer(503, {error:'COUNTER_SANDBOX_CONFIG_INVALID'});
    if (!sandboxReadAuthorized(req.headers.authorization, token)) return answer(401, {error:'UNAUTHORIZED'});
    if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '') || req.headers['content-encoding']) return answer(415, {error:'JSON_REQUIRED'});
    try {
      const request = await boundedRequest(req);
      issuer ||= createSandboxReceiptIssuer(store, {merchantId:env.NEO_COUNTER_SANDBOX_MERCHANT_ID, secret, now});
      send(res, 200, issuer.issueCandidate(request)); return true;
    } catch (error) {
      // Do not leak SQLite details, stack traces, identities or input data in error responses.
      const code = /^(COUNTER_SANDBOX_|SANDBOX_ORDER_|SANDBOX_TIMESTAMP_)[A-Z_]+$/.test(error?.message || '') ? error.message : 'COUNTER_SANDBOX_EMISSION_REJECTED';
      return answer(code === 'COUNTER_SANDBOX_REQUEST_TOO_LARGE' ? 413 : 409, {error:code});
    }
  };
}
