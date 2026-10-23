import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {mkdtempSync, rmSync, writeFileSync, chmodSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {probeSandboxProvider, sandboxReadAuthorized, validateSandboxOrder, sandboxOrderDigest,
  authenticateCounterReceipt, SandboxEvidenceLedger, verifySandboxPayment} from './cloudSandbox.mjs';
import {runCloudSandboxGate} from './cloudSandboxGate.mjs';

// All identities, transactions and API responses below are synthetic fixtures.
const NOW = Date.parse('2026-10-23T20:00:00.000Z');
const TX = 'a'.repeat(64), BLOCK = 'b'.repeat(64), SECRET = 'fixture-only-counter-signing-key-32-bytes';
const PROVIDER_ID = '00000000-0000-4000-8000-000000000001';
const env = {NEO_CLOUD_SANDBOX_ENABLED: 'true', NICEHASH_TEST_API_KEY: 'fixture-key',
  NICEHASH_TEST_API_SECRET: 'fixture-secret', NICEHASH_TEST_ORGANIZATION_ID: 'fixture-org', NICEHASH_TEST_ORDER_ID: PROVIDER_ID};
const order = {provider:'NICEHASH_TESTNET',providerOrderId:PROVIDER_ID,environment: 'sandbox', network: 'testnet3', currency: 'BTC_TESTNET', service: 'neo-miner',
  orderId: 'fixture-order', merchantId: 'fixture-merchant', customerId: 'fixture-customer',
  amountSats: 1000, minConfirmations: 3, scriptPubKey: '0014' + 'c'.repeat(40),
  createdAt: new Date(NOW-60000).toISOString(), expiresAt: new Date(NOW+600000).toISOString()};
const json = data => new Response(JSON.stringify(data), {headers: {'content-type':'application/json'}});
function candidate(o = order, change = {}) {
  const receipt = {schema:'neo.counter.sandbox-payment.v1', issuer:'NEO_COUNTER',
    environment:o.environment, network:o.network, currency:o.currency, service:o.service,
    orderId:o.orderId, merchantId:o.merchantId, customerId:o.customerId, amountSats:o.amountSats,
    orderDigest:sandboxOrderDigest(o,NOW), receiptId:'fixture-receipt', txid:TX, vout:0,
    issuedAt:new Date(NOW).toISOString(), ...change};
  const rawBody = JSON.stringify(receipt);
  const signature = 'sha256=' + createHmac('sha256',SECRET).update('neo-counter.sandbox.receipt.v1\0').update(rawBody).digest('hex');
  return {rawBody, signature, secret:SECRET, order:o};
}
function observer({txChanges={}, outputChanges={}, confirmations=3, canonical=BLOCK, statusChanges={}, captured=[]}={}) {
  return async (url, options) => {
    captured.push({url,options});
    assert.equal(options.method,'GET'); assert.equal(options.redirect,'error');
    assert.equal(options.headers.authorization,undefined); assert.equal(options.headers['X-Auth'],undefined);
    assert.ok(url.startsWith('https://blockstream.info/testnet/api/'));
    if (url.endsWith(`/tx/${TX}`)) return json({txid:TX, vin:[{is_coinbase:false}],
      vout:[{scriptpubkey:order.scriptPubKey,value:1000,...outputChanges}],
      status:{confirmed:true,block_height:100,block_hash:BLOCK},...txChanges});
    if (url.endsWith('/blocks/tip/height')) return new Response(String(100+confirmations-1));
    if (url.endsWith('/block-height/100')) return new Response(canonical);
    if (url.endsWith(`/tx/${TX}/status`)) return json({confirmed:true,block_height:100,block_hash:BLOCK,...statusChanges});
    throw new Error('unexpected fixture URL');
  };
}
async function verify(input = candidate(), fetchImpl = observer(), ledger = new SandboxEvidenceLedger(':memory:')) {
  return verifySandboxPayment({...input,fetchImpl,ledger,now:()=>NOW});
}

test('sandbox defaults off and missing credentials never make a request',async()=>{
  for (const e of [{},{NEO_CLOUD_SANDBOX_ENABLED:'true'}]) {
    const r=await probeSandboxProvider({env:e,fetchImpl:()=>{throw Error('MUST_NOT_FETCH')}});
    assert.equal(r.authenticated,false);assert.equal(r.purchasesEnabled,false);
  }
});
test('private diagnostic requires a separate exact constant-time bearer match',()=>{
  const token='d'.repeat(64);
  assert.equal(sandboxReadAuthorized('Bearer '+token,token),true);
  for (const h of [null,'Bearer short','Basic '+token,'Bearer '+token+' ']) assert.equal(sandboxReadAuthorized(h,token),false);
  assert.equal(sandboxReadAuthorized('Bearer short','short'),false);
});
test('authenticated empty list is not a selected allocation',async()=>{
  const r=await probeSandboxProvider({env,fetchImpl:async()=>json({list:[]}),now:()=>NOW});
  assert.equal(r.authenticated,true);assert.equal(r.selectedOrderObserved,false);
});
test('unknown API shape cannot count as an authenticated order read',async()=>{
  for (const body of [{ok:true},{list:'wrong'},{list:[{id:'bad'}]},{error:'secret body'}]) {
    const r=await probeSandboxProvider({env,fetchImpl:async()=>json(body),now:()=>NOW});
    assert.equal(r.authenticated,false);assert.equal(r.status,'TEST_PROVIDER_READ_FAILED');
    assert.equal(JSON.stringify(r).includes('secret body'),false);
  }
});
test('own SHA256 order and statistics are observed without exposing identifiers or claiming BTC',async()=>{
  const calls=[];
  const r=await probeSandboxProvider({env,now:()=>NOW,fetchImpl:async(url,options)=>{
    calls.push({url,options});
    return json(url.endsWith('/myOrders')?{list:[{id:PROVIDER_ID,algorithm:{algorithm:'SHA256ASICBOOST'},poolPassword:'never-display'}]}:{stats:[]});
  }});
  assert.equal(r.status,'TEST_ACCOUNT_AND_ORDER_READ_VERIFIED');assert.equal(r.btcReceived,null);
  assert.equal(r.acceptedShares,null);assert.equal(r.contractActivationEnabled,false);
  assert.equal(JSON.stringify(r).includes(PROVIDER_ID),false);assert.equal(JSON.stringify(r).includes('never-display'),false);
  assert.ok(calls.every(c=>c.options.method==='GET' && c.url.startsWith('https://api-test.nicehash.com/')));
});
test('non-Bitcoin order cannot satisfy the integration gate',async()=>{
  const r=await probeSandboxProvider({env,now:()=>NOW,fetchImpl:async()=>json({list:[{id:PROVIDER_ID,algorithm:'RANDOMXMONERO'}]})});
  assert.equal(r.orderStatisticsRead,false);assert.equal(r.status,'TEST_ORDER_NOT_BITCOIN_HASHPOWER');
});
for (const change of [{network:'mainnet'},{network:'testnet4'},{currency:'USD'},{service:'neo-generator'},
  {amountSats:NaN},{amountSats:0},{amountSats:1.5},{minConfirmations:0},{scriptPubKey:'bad'},
  {expiresAt:new Date(NOW-1).toISOString()},{createdAt:'not-a-time'}]) {
  test('trusted order rejects '+JSON.stringify(change),()=>assert.throws(()=>validateSandboxOrder({...order,...change},NOW)));
}
test('Counter signature binds every submitted byte and ignores browser claims',()=>{
  const c=candidate();assert.equal(authenticateCounterReceipt({...c,nowMs:NOW}).receipt.txid,TX);
  assert.throws(()=>authenticateCounterReceipt({...c,rawBody:c.rawBody+' ',nowMs:NOW}),/SIGNATURE_INVALID/);
  assert.throws(()=>authenticateCounterReceipt({...c,signature:'sha256='+'0'.repeat(64),nowMs:NOW}),/SIGNATURE_INVALID/);
  assert.throws(()=>authenticateCounterReceipt({rawBody:'{"neo_checkout":"success"}',order,nowMs:NOW}),/AUTH_REQUIRED/);
});
for (const change of [{customerId:'other'},{merchantId:'other'},{orderId:'other'},{amountSats:2000},{network:'mainnet'},
  {orderDigest:'0'.repeat(64)},{vout:-1},{txid:'../withdraw'},{issuedAt:new Date(NOW+6000).toISOString()},
  {issuedAt:new Date(NOW-301000).toISOString()}]) {
  test('signed mismatched receipt rejected '+JSON.stringify(change),async()=>{
    await assert.rejects(()=>verify(candidate(order,change),()=>{throw Error('MUST_NOT_FETCH')}));
  });
}
test('independent testnet observation is bounded to its own network and cannot activate anything',async()=>{
  const ledger=new SandboxEvidenceLedger(':memory:');const captured=[];
  try {
    const r=await verify(candidate(),observer({captured}),ledger);
    assert.equal(r.paymentVerified,true);assert.equal(r.confirmations,3);assert.equal(r.network,'testnet3');
    for (const flag of ['purchasesEnabled','contractActivationEnabled','tokenIssuanceEnabled','mainnetSettlementEnabled']) assert.equal(r[flag],false);
    assert.equal(captured.length,4);assert.equal(r.durableReplayProtection,false);
  } finally {ledger.close()}
});
for (const [name,options] of Object.entries({wrongDestination:{outputChanges:{scriptpubkey:'0014'+'e'.repeat(40)}},
  underpayment:{outputChanges:{value:999}},overpayment:{outputChanges:{value:1001}},
  unconfirmed:{txChanges:{status:{confirmed:false}}},coinbase:{txChanges:{vin:[{is_coinbase:true}]}},
  wrongTransaction:{txChanges:{txid:'c'.repeat(64)}},insufficient:{confirmations:2},
  reorg:{canonical:'c'.repeat(64)},reorgDuringFetch:{statusChanges:{confirmed:false}}})) {
  test(name+' fails payment verification',async()=>{
    const ledger=new SandboxEvidenceLedger(':memory:');
    try{await assert.rejects(()=>verify(candidate(),observer(options),ledger))}finally{ledger.close()}
  });
}
test('HTTP errors, broken JSON and oversized streams fail closed',async()=>{
  for(const fn of [async()=>new Response('private message',{status:500}),async()=>new Response('{bad'),
    async()=>new Response('x'.repeat(2000001))]) {
    const ledger=new SandboxEvidenceLedger(':memory:');try{await assert.rejects(()=>verify(candidate(),fn,ledger))}finally{ledger.close()}
  }
});
test('ledger is restart-safe and a payment output cannot back a second order',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'neo-cloud-test-'));const path=join(dir,'sandbox.sqlite');
  let ledger=new SandboxEvidenceLedger(path);
  try {
    const a=await verify(candidate(),observer(),ledger);assert.equal(a.replayed,false);assert.equal(a.durableReplayProtection,true);
    ledger.close();ledger=new SandboxEvidenceLedger(path);
    assert.equal((await verify(candidate(),observer(),ledger)).replayed,true);
    const other={...order,orderId:'other-order'};
    await assert.rejects(()=>verify(candidate(other,{receiptId:'other-receipt'}),observer(),ledger),/ALREADY_BOUND/);
    // Even an exact replay must re-check chain evidence; saved success cannot bypass a reorg.
    await assert.rejects(()=>verify(candidate(),observer({canonical:'c'.repeat(64)}),ledger),/REORG/);
  } finally {ledger.close();rmSync(dir,{recursive:true,force:true})}
});
test('CLI missing evidence reports blockers without sending private requests',async()=>{
  const r=await runCloudSandboxGate({env:{},now:()=>NOW,fetchImpl:()=>{throw Error('MUST_NOT_FETCH')}});
  assert.equal(r.gatePassed,false);assert.equal(r.status,'BLOCKED');assert.equal(r.counter.paymentVerified,false);
});
test('fixture end-to-end account plus payment proof is sandbox-only, and files need mode 600',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'neo-cloud-gate-'));const c=candidate();
  const config={...env,NEO_COUNTER_SANDBOX_RECEIPT_SECRET:SECRET,NEO_CLOUD_SANDBOX_LEDGER_PATH:join(dir,'db.sqlite')};
  for(const [key,value] of Object.entries({ORDER:JSON.stringify(order),RECEIPT:c.rawBody,SIGNATURE:c.signature})) {
    const path=join(dir,key);writeFileSync(path,value,{mode:0o600});config[`NEO_COUNTER_SANDBOX_${key}_FILE`]=path;
  }
  const chain=observer();const fetchImpl=async(url,options)=>url.startsWith('https://api-test.nicehash.com')?
    json(url.endsWith('/myOrders')?{list:[{id:PROVIDER_ID,algorithm:'SHA256'}]}:{stats:[]}):chain(url,options);
  try {
    const result=await runCloudSandboxGate({env:config,now:()=>NOW,fetchImpl});
    assert.equal(result.gatePassed,true);assert.equal(result.contractActivationEnabled,false);
    assert.equal(JSON.stringify(result).includes(SECRET),false);assert.equal(JSON.stringify(result).includes(TX),false);
    chmodSync(config.NEO_COUNTER_SANDBOX_RECEIPT_FILE,0o644);
    const denied=await runCloudSandboxGate({env:config,now:()=>NOW,fetchImpl});assert.equal(denied.gatePassed,false);
  } finally {rmSync(dir,{recursive:true,force:true})}
});
