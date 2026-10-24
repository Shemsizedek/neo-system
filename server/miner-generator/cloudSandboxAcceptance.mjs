import {openSync, closeSync, fstatSync, lstatSync, realpathSync, readSync, constants} from 'node:fs';
import {isAbsolute, dirname, resolve, basename} from 'node:path';
import {pathToFileURL} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {SANDBOX_BOUNDARY, validateSandboxOrder, authenticateCounterReceipt,
  probeSandboxProvider, SandboxEvidenceLedger, verifySandboxPayment} from './cloudSandbox.mjs';

const ROUTE = '/sandbox/cloud-miner/receipt-candidate';
const HEX64 = /^[a-f0-9]{64}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const REQUIRED = Object.freeze([
  'NICEHASH_TEST_API_KEY', 'NICEHASH_TEST_API_SECRET', 'NICEHASH_TEST_ORGANIZATION_ID',
  'NICEHASH_TEST_ORDER_ID', 'NEO_COUNTER_SANDBOX_EMITTER_URL',
  'NEO_COUNTER_SANDBOX_ALLOWED_ORIGIN', 'NEO_COUNTER_SANDBOX_EMITTER_TOKEN',
  'NEO_COUNTER_SANDBOX_RECEIPT_SECRET', 'NEO_COUNTER_SANDBOX_MERCHANT_ID',
  'NEO_COUNTER_SANDBOX_ORDER_FILE', 'NEO_COUNTER_SANDBOX_TRANSACTION_FILE',
  'NEO_CLOUD_SANDBOX_LEDGER_PATH'
]);
const fail = code => {throw new Error(code);};
const text = value => typeof value === 'string' && value.length > 0 && value.length <= 4096 && !/[\0\r\n]/.test(value);
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);

// The dedicated immediate parent is owner-only. Canonical-path equality rejects
// symlink ancestors. Same-UID/root compromise is outside this filesystem boundary.
function privateParent(path) {
  if (typeof process.getuid !== 'function' || !text(path) || !isAbsolute(path) || resolve(path) !== path) fail('PRIVATE_PATH_REQUIRED');
  const parent = dirname(path), stat = lstatSync(parent);
  if (realpathSync(parent) !== parent || !stat.isDirectory() || stat.isSymbolicLink() ||
      stat.uid !== process.getuid() || (stat.mode & 0o077)) fail('PRIVATE_PARENT_REQUIRED');
}
function privateFileStat(stat) {
  if (!stat.isFile() || stat.nlink !== 1 || stat.uid !== process.getuid() || (stat.mode & 0o077)) fail('PRIVATE_FILE_REQUIRED');
}
export function readAcceptanceInput(path) {
  privateParent(path);
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const stat = fstatSync(fd); privateFileStat(stat);
    if (stat.size > 16384) fail('PRIVATE_INPUT_TOO_LARGE');
    const buffer = Buffer.alloc(16385); let size = 0;
    while (size < buffer.length) {
      const n = readSync(fd, buffer, size, buffer.length - size, null);
      if (!n) break; size += n;
    }
    if (size > 16384) fail('PRIVATE_INPUT_TOO_LARGE');
    return JSON.parse(buffer.subarray(0, size).toString('utf8'));
  } finally {closeSync(fd);}
}

// Never auto-create a directory, chmod an existing file, or point this runner at
// Counter's financial database. An existing ledger must contain only our table.
function checkLedger(path, deniedPaths) {
  privateParent(path);
  if (basename(path) !== 'sandbox-evidence.sqlite' || deniedPaths.includes(path)) fail('ISOLATED_LEDGER_REQUIRED');
  for (const candidate of [path, path + '-wal', path + '-shm', path + '-journal']) {
    try {privateFileStat(lstatSync(candidate));} catch (error) {if (error.code !== 'ENOENT') throw error;}
  }
  let stat; try {stat = lstatSync(path);} catch (error) {if (error.code === 'ENOENT') return; throw error;}
  if (stat.size === 0) return;
  const db = new DatabaseSync(path, {readOnly:true});
  try {
    const rows = db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
    if (rows.some(row => row.name !== 'sandbox_payment_evidence')) fail('NON_SANDBOX_DATABASE_REJECTED');
  } finally {db.close();}
}

export function acceptanceEndpoint(env) {
  const raw = env.NEO_COUNTER_SANDBOX_EMITTER_URL, allowed = env.NEO_COUNTER_SANDBOX_ALLOWED_ORIGIN;
  if (!text(raw) || !text(allowed)) fail('COUNTER_ENDPOINT_REQUIRED');
  const url = new URL(raw), origin = new URL(allowed);
  const local = ['127.0.0.1', '[::1]'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) ||
      url.pathname !== ROUTE || url.username || url.password || url.search || url.hash ||
      origin.origin !== allowed || url.origin !== allowed || origin.username || origin.password ||
      raw !== url.href) fail('COUNTER_ENDPOINT_NOT_APPROVED');
  return url.href;
}

function collectConfig(env, now) {
  const checks = [];
  const check = (name, fn) => {
    try {fn(); checks.push({name, ok:true});}
    catch {checks.push({name, ok:false});}
  };
  const missing = REQUIRED.filter(key => !text(env[key]));
  check('sandbox_enabled', () => {if (env.NEO_CLOUD_SANDBOX_ENABLED !== 'true') fail('DISABLED');});
  check('required_configuration_present', () => {if (missing.length) fail('MISSING');});
  check('test_account_identifiers', () => {
    if (!UUID.test(env.NICEHASH_TEST_ORDER_ID || '') || !text(env.NICEHASH_TEST_API_KEY) ||
        !text(env.NICEHASH_TEST_API_SECRET) || !text(env.NICEHASH_TEST_ORGANIZATION_ID)) fail('PROVIDER');
  });
  check('separate_service_credentials', () => {
    const token = env.NEO_COUNTER_SANDBOX_EMITTER_TOKEN, secret = env.NEO_COUNTER_SANDBOX_RECEIPT_SECRET;
    if (!HEX64.test(token || '') || !text(secret) || Buffer.byteLength(secret) < 32 || Buffer.byteLength(secret) > 1024) fail('CREDENTIALS');
    const keys = [token, secret, env.NICEHASH_TEST_API_KEY, env.NICEHASH_TEST_API_SECRET];
    if (keys.some(key => !text(key)) || new Set(keys).size !== keys.length) fail('KEY_REUSE');
  });
  let endpoint, order, reference;
  check('approved_counter_origin', () => {endpoint = acceptanceEndpoint(env);});
  check('trusted_private_invoice', () => {
    order = validateSandboxOrder(readAcceptanceInput(env.NEO_COUNTER_SANDBOX_ORDER_FILE), now());
    if (!ID.test(env.NEO_COUNTER_SANDBOX_MERCHANT_ID || '') || order.merchantId !== env.NEO_COUNTER_SANDBOX_MERCHANT_ID ||
        order.providerOrderId.toLowerCase() !== (env.NICEHASH_TEST_ORDER_ID || '').toLowerCase()) fail('ORDER_BINDING');
  });
  check('private_test_transaction_reference', () => {
    reference = readAcceptanceInput(env.NEO_COUNTER_SANDBOX_TRANSACTION_FILE);
    if (!plain(reference) || Object.keys(reference).sort().join(',') !== 'txid,vout' || !HEX64.test(reference.txid || '') ||
        !Number.isSafeInteger(reference.vout) || reference.vout < 0 || reference.vout > 100000) fail('TRANSACTION_REFERENCE');
  });
  check('isolated_private_evidence_ledger', () => checkLedger(env.NEO_CLOUD_SANDBOX_LEDGER_PATH,
    [env.NEO_COUNTER_DB_PATH, env.NEO_COUNTER_SANDBOX_ORDER_FILE, env.NEO_COUNTER_SANDBOX_TRANSACTION_FILE]));
  return {checks, missing, ready:checks.every(row => row.ok), endpoint, order, reference};
}

/** No requests, secret creation, schema migration or evidence writes. */
export function acceptancePreflight({env=process.env, now=Date.now}={}) {
  const cfg = collectConfig(env, now);
  return {...SANDBOX_BOUNDARY, phase:'CONFIGURATION_PREFLIGHT', gatePassed:false,
    configured:cfg.ready, status:cfg.ready ? 'CONFIGURED_NOT_AUTHENTICATED' : 'BLOCKED',
    checks:cfg.checks, missing:cfg.missing, networkRequestsMade:false,
    credentialsAuthenticated:false, paymentVerified:false, durableVolumeVerified:false};
}

async function boundedCandidate(response) {
  if (!response.ok || response.redirected || !/^application\/json(?:;|$)/i.test(response.headers.get('content-type') || '') ||
      Number(response.headers.get('content-length')) > 32768 || !response.body) fail('COUNTER_RESPONSE_REJECTED');
  const reader = response.body.getReader(), chunks=[]; let size=0;
  try {
    while (true) {
      const {done, value} = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 32768) {await reader.cancel(); fail('COUNTER_RESPONSE_TOO_LARGE');}
      chunks.push(Buffer.from(value));
    }
  } finally {reader.releaseLock();}
  const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (!plain(value) || value.status !== 'SIGNED_TEST_PAYMENT_CANDIDATE_ONLY' || value.candidateEmitted !== true ||
      value.paymentVerified !== false || value.independentlyObserved !== false || typeof value.rawBody !== 'string' ||
      typeof value.signature !== 'string') fail('COUNTER_CANDIDATE_INVALID');
  for (const [key, expected] of Object.entries(SANDBOX_BOUNDARY)) if (value[key] !== expected) fail('COUNTER_BOUNDARY_INVALID');
  return {rawBody:value.rawBody, signature:value.signature};
}

/** One operator invocation, no interactive secrets and no fixture fallback.
 * The single POST only emits/audits a candidate for an already provisioned test
 * invoice. Provider/chain reads cannot buy hashpower or broadcast a payment.
 */
export async function runSandboxAcceptance({env=process.env, fetchImpl=fetch, now=Date.now}={}) {
  const injected = fetchImpl !== globalThis.fetch || now !== Date.now;
  const report = {...SANDBOX_BOUNDARY, phase:'SANDBOX_ACCEPTANCE', gatePassed:false,
    integrationChecksPassed:false, status:'BLOCKED',
    execution:injected ? 'INJECTED_TEST_TRANSPORT_OR_CLOCK' : 'OPERATOR_NETWORK_OBSERVATION',
    externalEvidenceVerified:false, providerAuthenticated:false, selectedOrderObserved:false,
    candidateAuthenticated:false, paymentVerified:false, durableReplayProtection:false,
    blockers:[]};
  const cfg = collectConfig(env, now);
  if (!cfg.ready) return {...report, preflight:acceptancePreflight({env,now}), blockers:['CONFIGURATION_PREFLIGHT_FAILED']};
  if (env.NEO_CLOUD_SANDBOX_ACCEPTANCE_APPROVED !== 'true') return {...report, blockers:['OPERATOR_ACCEPTANCE_APPROVAL_REQUIRED']};
  const provider = await probeSandboxProvider({env, fetchImpl, now});
  report.providerAuthenticated = provider.authenticated === true;
  report.selectedOrderObserved = provider.selectedOrderObserved === true;
  if (provider.status !== 'TEST_ACCOUNT_AND_ORDER_READ_VERIFIED') return {...report, blockers:['AUTHENTICATED_PROVIDER_ORDER_REQUIRED']};
  let candidate;
  try {
    const response = await fetchImpl(cfg.endpoint, {method:'POST', redirect:'error',
      signal:AbortSignal.timeout(8000), headers:{accept:'application/json','content-type':'application/json',
        authorization:`Bearer ${env.NEO_COUNTER_SANDBOX_EMITTER_TOKEN}`},
      body:JSON.stringify({orderId:cfg.order.orderId, txid:cfg.reference.txid, vout:cfg.reference.vout})});
    candidate = await boundedCandidate(response);
    const checked = authenticateCounterReceipt({...candidate, order:cfg.order,
      secret:env.NEO_COUNTER_SANDBOX_RECEIPT_SECRET, nowMs:now()});
    if (checked.receipt.txid !== cfg.reference.txid || checked.receipt.vout !== cfg.reference.vout) fail('REFERENCE_MISMATCH');
    report.candidateAuthenticated = true;
  } catch {return {...report, blockers:['COUNTER_CANDIDATE_NOT_AUTHENTICATED']};}
  let ledger;
  try {
    checkLedger(env.NEO_CLOUD_SANDBOX_LEDGER_PATH,
      [env.NEO_COUNTER_DB_PATH,env.NEO_COUNTER_SANDBOX_ORDER_FILE,env.NEO_COUNTER_SANDBOX_TRANSACTION_FILE]);
    ledger = new SandboxEvidenceLedger(env.NEO_CLOUD_SANDBOX_LEDGER_PATH);
    const payment = await verifySandboxPayment({...candidate, order:cfg.order, ledger,
      secret:env.NEO_COUNTER_SANDBOX_RECEIPT_SECRET, fetchImpl, now});
    report.paymentVerified = payment.paymentVerified === true;
    report.durableReplayProtection = payment.durableReplayProtection === true;
    report.integrationChecksPassed = report.paymentVerified && report.durableReplayProtection;
    report.gatePassed = report.integrationChecksPassed && !injected;
    report.externalEvidenceVerified = report.gatePassed;
    report.status = report.gatePassed ? 'SANDBOX_INTEGRATION_VERIFIED' :
      report.integrationChecksPassed ? 'FIXTURE_INTEGRATION_PASSED_NOT_EXTERNAL_PROOF' : 'BLOCKED';
    report.replayed = payment.replayed;
    report.confirmations = payment.confirmations;
    report.verifiedAt = payment.verifiedAt;
    if (!report.gatePassed) report.blockers.push(injected ? 'EXTERNAL_EVIDENCE_NOT_OBSERVED' : 'PAYMENT_EVIDENCE_REQUIRED');
    return report;
  } catch {return {...report, blockers:['INDEPENDENT_TEST_PAYMENT_NOT_VERIFIED']};}
  finally {ledger?.close();}
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const args = process.argv.slice(2);
    if (args.length > 1 || (args.length && !['--preflight','--run'].includes(args[0]))) fail('CLI_ARGUMENTS');
    const run = args[0] === '--run';
    const result = run ? await runSandboxAcceptance() : acceptancePreflight();
    console.log(JSON.stringify(result,null,2));
    process.exitCode = (run ? result.gatePassed : result.configured) ? 0 : 2;
  } catch {
    console.log(JSON.stringify({...SANDBOX_BOUNDARY,gatePassed:false,status:'BLOCKED',blockers:['ACCEPTANCE_INPUT_OR_RUNTIME_REJECTED']}));
    process.exitCode = 2;
  }
}
