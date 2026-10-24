import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createStore} from './store.mjs';
import {createHandler} from './server.mjs';
import {createSandboxReceiptIssuer, CLOUD_RECEIPT_ROUTE} from './cloudSandboxEmitter.mjs';
import {authenticateCounterReceipt, SandboxEvidenceLedger, verifySandboxPayment} from '../miner-generator/cloudSandbox.mjs';

// All accounts, invoices, transactions and observer replies below are SYNTHETIC.
const NOW=Date.parse('2026-10-23T20:00:00.000Z');
const SECRET='fixture-counter-signing-secret-not-live-32';
const TOKEN='d'.repeat(64), TX='a'.repeat(64), BLOCK='b'.repeat(64);
const order={environment:'sandbox',network:'testnet3',currency:'BTC_TESTNET',service:'neo-miner',
  provider:'NICEHASH_TESTNET',providerOrderId:'00000000-0000-4000-8000-000000000001',
  orderId:'test-order',merchantId:'test-merchant',customerId:'test-customer',amountSats:1000,
  minConfirmations:3,scriptPubKey:'0014'+'c'.repeat(40),
  createdAt:new Date(NOW-60000).toISOString(),expiresAt:new Date(NOW+600000).toISOString()};
const request={orderId:order.orderId,txid:TX,vout:0};
const env={NEO_COUNTER_SANDBOX_ENABLED:'true',NEO_COUNTER_SANDBOX_EMITTER_TOKEN:TOKEN,
  NEO_COUNTER_SANDBOX_RECEIPT_SECRET:SECRET,NEO_COUNTER_SANDBOX_MERCHANT_ID:order.merchantId};
function fixture({path=':memory:',now=()=>NOW}={}) {
  const store=createStore(path);
  return {store,issuer:createSandboxReceiptIssuer(store,{merchantId:order.merchantId,secret:SECRET,now})};
}
async function withServer(fn,{configured=env,provision=true}={}) {
  const {store,issuer}=fixture(); if(provision)issuer.provisionInvoice(order);
  const auth={sessionPrincipal:()=>({kind:'admin',merchantId:'*',terminalId:'fixture',permissions:['*']}),can:()=>true};
  const server=http.createServer(createHandler(store,{auth,sandboxEnv:configured,sandboxNow:()=>NOW})).listen(0,'127.0.0.1');
  await once(server,'listening');
  const base=`http://127.0.0.1:${server.address().port}`;
  const post=(body=request,options={})=>fetch(base+CLOUD_RECEIPT_ROUTE,{method:'POST',
    headers:{authorization:'Bearer '+TOKEN,'content-type':'application/json'},body:JSON.stringify(body),...options});
  try{return await fn({base,post,store,issuer});}
  finally{server.closeAllConnections();await new Promise(r=>server.close(r));store.close();}
}
const observer=async url=>{
  if(url.endsWith('/tx/'+TX))return Response.json({txid:TX,vin:[{is_coinbase:false}],
    vout:[{scriptpubkey:order.scriptPubKey,value:1000}],status:{confirmed:true,block_height:100,block_hash:BLOCK}});
  if(url.endsWith('/status'))return Response.json({confirmed:true,block_height:100,block_hash:BLOCK});
  if(url.endsWith('/blocks/tip/height'))return new Response('102');
  if(url.endsWith('/block-height/100'))return new Response(BLOCK);
  throw Error('unexpected fixture URL');
};

test('Counter HTTP emission binds trusted invoice; Generator independently verifies synthetic chain',()=>withServer(async({post,store})=>{
  const response=await post();assert.equal(response.status,200);
  const candidate=await response.json();
  assert.equal(candidate.paymentVerified,false);assert.equal(candidate.independentlyObserved,false);
  for(const name of ['purchasesEnabled','contractActivationEnabled','tokenIssuanceEnabled','mainnetSettlementEnabled'])assert.equal(candidate[name],false);
  const checked=authenticateCounterReceipt({...candidate,secret:SECRET,order,nowMs:NOW});
  assert.equal(checked.receipt.amountSats,1000);assert.equal(checked.receipt.customerId,order.customerId);
  const ledger=new SandboxEvidenceLedger(':memory:');
  try {
    const result=await verifySandboxPayment({...candidate,secret:SECRET,order,ledger,fetchImpl:observer,now:()=>NOW});
    assert.equal(result.paymentVerified,true);assert.equal(result.contractActivationEnabled,false);
  } finally {ledger.close();}
  const event=store.listEvents(order.merchantId).find(e=>e.type==='sandbox.cloud-miner.receipt-candidate');
  assert.equal(event.payload.paymentVerified,false);assert.equal('signature' in event.payload,false);
  assert.equal(JSON.stringify(store.listEvents(order.merchantId)).includes(SECRET),false);
}));

test('disabled endpoint, missing configuration and normal Counter admin access cannot authorize issuance',async()=>{
  await withServer(async({post})=>assert.equal((await post()).status,404),{configured:{}});
  await withServer(async({post})=>assert.equal((await post()).status,503),{configured:{...env,NEO_COUNTER_SANDBOX_EMITTER_TOKEN:''}});
  await withServer(async({post})=>{
    assert.equal((await post(request,{headers:{'content-type':'application/json'}})).status,401);
    assert.equal((await post(request,{headers:{'content-type':'application/json',authorization:'Bearer ordinary-admin-token'}})).status,401);
  });
  await withServer(async({post})=>assert.equal((await post()).status,503),{configured:{...env,NEO_COUNTER_SANDBOX_RECEIPT_SECRET:TOKEN}});
});

test('browser origins, cookies, query strings, GET, non-JSON and oversized bodies are rejected',()=>withServer(async({base,post})=>{
  for(const h of [{origin:'https://neo.example'},{cookie:'session=not-allowed'}]) {
    const r=await post(request,{headers:{authorization:'Bearer '+TOKEN,'content-type':'application/json',...h}});
    assert.equal(r.status,403);assert.equal(r.headers.get('access-control-allow-origin'),null);
  }
  assert.equal((await fetch(base+CLOUD_RECEIPT_ROUTE+'?token='+TOKEN,{method:'POST'})).status,403);
  assert.equal((await fetch(base+CLOUD_RECEIPT_ROUTE)).status,405);
  assert.equal((await post(request,{headers:{authorization:'Bearer '+TOKEN,'content-type':'text/plain'}})).status,415);
  assert.equal((await post(request,{body:'x'.repeat(5000)})).status,413);
  assert.equal((await post(request,{body:'{bad'})).status,409);
}));

test('generic Counter events and synced state cannot act as trusted invoice or payment proof',()=>withServer(async({post,store})=>{
  store.appendEvent({merchantId:order.merchantId,type:'paid',payload:{...order,neo_checkout:'success',txid:TX}});
  store.putEnvelope({id:'browser-state',merchantId:order.merchantId,entity:'cloud_sandbox_invoices',terminalId:'fake',version:0,payload:order});
  const r=await post();assert.equal(r.status,409);
  assert.equal((await r.json()).error,'COUNTER_SANDBOX_TRUSTED_INVOICE_REQUIRED');
},{provision:false}));

for(const extra of [{amountSats:1},{merchantId:'other'},{customerId:'other'},{network:'mainnet'},
  {paid:true},{orderDigest:'forged'},{scriptPubKey:'5120'+'1'.repeat(64)}]) {
  test('request cannot override invoice '+Object.keys(extra)[0],()=>withServer(async({post})=>{
    const r=await post({...request,...extra});assert.equal(r.status,409);
  }));
}

test('provisioning is immutable, idempotent, merchant scoped and sandbox only',()=>{
  const {store,issuer}=fixture();try {
    assert.equal(issuer.provisionInvoice(order).replayed,false);
    assert.equal(issuer.provisionInvoice(order).replayed,true);
    assert.throws(()=>issuer.provisionInvoice({...order,amountSats:2000}),/IMMUTABLE/);
    assert.throws(()=>issuer.provisionInvoice({...order,orderId:'another'}),/DESTINATION_REUSED/);
    assert.throws(()=>issuer.provisionInvoice({...order,merchantId:'other'}),/MERCHANT_MISMATCH/);
    for(const patch of [{network:'mainnet'},{currency:'USD'},{amountSats:1.5},{minConfirmations:0},{scriptPubKey:'6a00'}])
      assert.throws(()=>issuer.provisionInvoice({...order,...patch}));
  }finally{store.close();}
});

test('raw signed bytes and unique bindings survive Counter restart; duplicates do not create more events',()=>{
  const dir=mkdtempSync(join(tmpdir(),'neo-emitter-'));const path=join(dir,'counter.sqlite');
  let {store,issuer}=fixture({path});
  try {
    issuer.provisionInvoice(order);const first=issuer.issueCandidate(request);
    store.close();({store,issuer}=fixture({path}));
    const replay=issuer.issueCandidate(request);assert.equal(replay.replayed,true);assert.equal(replay.rawBody,first.rawBody);
    assert.equal(replay.signature,first.signature);
    assert.throws(()=>issuer.issueCandidate({...request,txid:'f'.repeat(64)}),/ALREADY_BOUND/);
    issuer.provisionInvoice({...order,orderId:'other-order',scriptPubKey:'0014'+'e'.repeat(40)});
    assert.throws(()=>issuer.issueCandidate({...request,orderId:'other-order'}),/ALREADY_BOUND/);
    assert.equal(store.listEvents(order.merchantId).filter(e=>e.type==='sandbox.cloud-miner.receipt-candidate').length,1);
  } finally {store.close();rmSync(dir,{recursive:true,force:true});}
});

test('expired candidate requires review, never silently reissued as fresh',()=>{
  let clock=NOW;const {store,issuer}=fixture({now:()=>clock});try {
    issuer.provisionInvoice(order);issuer.issueCandidate(request);clock+=300001;
    assert.throws(()=>issuer.issueCandidate(request),/EXPIRED_REVIEW_REQUIRED/);
  }finally{store.close();}
});

test('transaction rollback covers invoice/candidate AND audit event',()=>{
  const {store,issuer}=fixture();try {
    const original=store.appendEvent;store.appendEvent=()=>{throw Error('simulated durable failure');};
    assert.throws(()=>issuer.provisionInvoice(order),/failure/);
    assert.equal(store.db.prepare('SELECT count(*) AS n FROM cloud_sandbox_invoices').get().n,0);
    store.appendEvent=original;issuer.provisionInvoice(order);
    store.appendEvent=()=>{throw Error('simulated durable failure');};
    assert.throws(()=>issuer.issueCandidate(request),/failure/);
    assert.equal(store.db.prepare('SELECT count(*) AS n FROM cloud_sandbox_candidates').get().n,0);
  }finally{store.close();}
});

test('signed candidate alone never satisfies payment verification or bogus chain data',async()=>{
  const {store,issuer}=fixture();const ledger=new SandboxEvidenceLedger(':memory:');
  try {
    issuer.provisionInvoice(order);const candidate=issuer.issueCandidate(request);
    assert.throws(()=>authenticateCounterReceipt({...candidate,rawBody:candidate.rawBody+' ',secret:SECRET,order,nowMs:NOW}),/SIGNATURE_INVALID/);
    await assert.rejects(()=>verifySandboxPayment({...candidate,secret:SECRET,order,ledger,now:()=>NOW,
      fetchImpl:async()=>Response.json({paid:true})}),/TRANSACTION_INVALID/);
  }finally{ledger.close();store.close();}
});
