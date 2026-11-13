import {openSync, fstatSync, readFileSync, closeSync, constants} from 'node:fs';
import {isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {SANDBOX_BOUNDARY, probeSandboxProvider, SandboxEvidenceLedger, verifySandboxPayment} from './cloudSandbox.mjs';
import {createNiceHashReadOnlyClient} from './nicehashReadOnly.mjs';

function protectedInput(path) {
  if (!isAbsolute(path)) throw new Error('SANDBOX_INPUT_REQUIRES_ABSOLUTE_PATH');
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.size > 16384 || (stat.mode & 0o077) !== 0) throw new Error('SANDBOX_INPUT_PERMISSIONS_OR_SIZE_INVALID');
    return readFileSync(fd, 'utf8');
  } finally { closeSync(fd); }
}

/** Operator-run, GET-only external integration check. No fixtures or automatic signing. */
export async function runCloudSandboxGate({env = process.env, fetchImpl = fetch, now = Date.now, probePublic = false} = {}) {
  const publicEndpoint = {checked: false, available: false, status: 'NOT_REQUESTED'};
  if (probePublic) {
    publicEndpoint.checked = true;
    try {
      const data = await createNiceHashReadOnlyClient({network: 'testnet', fetchImpl, now}).marketInfo();
      if (!Array.isArray(data.data?.miningAlgorithms) || !data.data.miningAlgorithms.some(a => ['SHA256','SHA256AsicBoost'].includes(a.name))) throw new Error('INVALID_MARKET');
      publicEndpoint.available = true; publicEndpoint.status = 'PUBLIC_TESTNET_MARKET_REACHABLE';
    } catch { publicEndpoint.status = 'PUBLIC_TESTNET_MARKET_UNAVAILABLE'; }
  }
  const provider = await probeSandboxProvider({env, fetchImpl, now});
  let counter = {paymentVerified: false, status: 'COUNTER_SANDBOX_EVIDENCE_NOT_CONFIGURED'};
  const needed = ['NEO_COUNTER_SANDBOX_ORDER_FILE', 'NEO_COUNTER_SANDBOX_RECEIPT_FILE',
    'NEO_COUNTER_SANDBOX_SIGNATURE_FILE', 'NEO_COUNTER_SANDBOX_RECEIPT_SECRET', 'NEO_CLOUD_SANDBOX_LEDGER_PATH'];
  const missing = needed.filter(name => typeof env[name] !== 'string' || !env[name]);
  if (!missing.length && env.NEO_CLOUD_SANDBOX_ENABLED === 'true') {
    let ledger;
    try {
      if (!isAbsolute(env.NEO_CLOUD_SANDBOX_LEDGER_PATH)) throw new Error('LEDGER_PATH');
      const order = JSON.parse(protectedInput(env.NEO_COUNTER_SANDBOX_ORDER_FILE));
      if (order.providerOrderId !== env.NICEHASH_TEST_ORDER_ID) throw new Error('COUNTER_PROVIDER_ORDER_MISMATCH');
      const rawBody = protectedInput(env.NEO_COUNTER_SANDBOX_RECEIPT_FILE);
      const signature = protectedInput(env.NEO_COUNTER_SANDBOX_SIGNATURE_FILE).trim();
      ledger = new SandboxEvidenceLedger(env.NEO_CLOUD_SANDBOX_LEDGER_PATH);
      counter = await verifySandboxPayment({order, rawBody, signature,
        secret: env.NEO_COUNTER_SANDBOX_RECEIPT_SECRET, ledger, fetchImpl, now});
    } catch { counter = {paymentVerified: false, status: 'COUNTER_SANDBOX_EVIDENCE_REJECTED'}; }
    finally { ledger?.close(); }
  } else counter.missing = missing;
  const blockers = [];
  if (provider.status !== 'TEST_ACCOUNT_AND_ORDER_READ_VERIFIED') blockers.push(provider.status);
  if (counter.paymentVerified !== true || counter.durableReplayProtection !== true) blockers.push(counter.status);
  return {...SANDBOX_BOUNDARY, generatedAt: new Date(now()).toISOString(),
    gatePassed: blockers.length === 0, status: blockers.length ? 'BLOCKED' : 'SANDBOX_INTEGRATION_VERIFIED',
    publicEndpoint, provider, counter, blockers,
    note: 'Test account reads and testnet payment observation are not mainnet capacity, pool-share proof, sale permission or token backing.'};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const report = await runCloudSandboxGate({probePublic: process.argv.includes('--probe-public')});
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.gatePassed ? 0 : 2;
  } catch {
    console.log(JSON.stringify({...SANDBOX_BOUNDARY, gatePassed: false, status: 'DIAGNOSTIC_FAILED'}));
    process.exitCode = 2;
  }
}
