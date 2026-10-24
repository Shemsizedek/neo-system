import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {mkdtempSync, mkdirSync, writeFileSync, chmodSync, symlinkSync, linkSync, existsSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {createStore} from '../neo-counter-backend/store.mjs';
import {createHandler} from '../neo-counter-backend/server.mjs';
import {createSandboxReceiptIssuer} from '../neo-counter-backend/cloudSandboxEmitter.mjs';
import {signReadRequest} from './nicehashReadOnly.mjs';
import {acceptanceEndpoint, acceptancePreflight, runSandboxAcceptance} from './cloudSandboxAcceptance.mjs';

// All identities, API responses, transactions and payment confirmations are fixtures.
// Actual TCP connections are loopback only. No provider or blockchain is contacted.
const NOW = Date.parse('2026-10-23T20:00:00.000Z');
const TOKEN = 'd'.repeat(64), SECRET = 'fixture-only-counter-secret-32-characters';
const ORDER_ID='00000000-0000-4000-8000-000000000001', TX='a'.repeat(64), BLOCK='b'.repeat(64);
const invoice = {environment:'sandbox',network:'testnet3',currency:'BTC_TESTNET',service:'neo-miner',
  provider:'NICEHASH_TESTNET',providerOrderId:ORDER_ID,orderId:'private-order',merchantId:'private-merchant',
  customerId:'private-customer',amountSats:1000,minConfirmations:3,scriptPubKey:'0014'+'c'.repeat(40),
  createdAt:new Date(NOW-60000).toISOString(),expiresAt:new Date(NOW+600000).toISOString()};
function localConfig() {
  const dir=mkdtempSync(join(tmpdir(),'neo-cloud-accept-'));
  const orderFile=join(dir,'invoice.json'), txFile=join(dir,'reference.json');
  writeFileSync(orderFile,JSON.stringify(invoice),{mode:0o600});
  writeFileSync(txFile,JSON.stringify({txid:TX,vout:0}),{mode:0o600});
  const env={NEO_CLOUD_SANDBOX_ENABLED:'true',NEO_CLOUD_SANDBOX_ACCEPTANCE_APPROVED:'true',
    NICEHASH_TEST_API_KEY:'fixture-provider-key',NICEHASH_TEST_API_SECRET:'fixture-provider-secret',
    NICEHASH_TEST_ORGANIZATION_ID:'fixture-organization',NICEHASH_TEST_ORDER_ID:ORDER_ID,
    NEO_COUNTER_SANDBOX_EMITTER_TOKEN:TOKEN,NEO_COUNTER_SANDBOX_RECEIPT_SECRET:SECRET,
    NEO_COUNTER_SANDBOX_MERCHANT_ID:invoice.merchantId,NEO_COUNTER_SANDBOX_ORDER_FILE:orderFile,
    NEO_COUNTER_SANDBOX_TRANSACTION_FILE:txFile,NEO_CLOUD_SANDBOX_LEDGER_PATH:join(dir,'sandbox-evidence.sqlite'),
    NEO_COUNTER_SANDBOX_ALLOWED_ORIGIN:'http://127.0.0.1:8787',
    NEO_COUNTER_SANDBOX_EMITTER_URL:'http://127.0.0.1:8787/sandbox/cloud-miner/receipt-candidate'};
  return {dir,env,clean:()=>rmSync(dir,{recursive:true,force:true})};
}
const preflight=env=>acceptancePreflight({env,now:()=>NOW});
const output=(res,status,value)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(value));};
async function listen(handler) {
  const server=http.createServer(handler).listen(0,'127.0.0.1'); await once(server,'listening');
  return {server,base:`http://127.0.0.1:${server.address().port}`};
}
async function exercise(fn,options={}) {
  const cfg=localConfig(),{env}=cfg; const counts={provider:0,counter:0,observer:0};
  const store=createStore(join(cfg.dir,'counter.sqlite'));
  const issuer=createSandboxReceiptIssuer(store,{merchantId:invoice.merchantId,secret:SECRET,now:()=>NOW});
  if(options.provision!==false)issuer.provisionInvoice(invoice);
  const mode={providerDenied:false,reorg:false,badSignature:false,pretendPaid:false,badAmount:false,...options};
  const provider=await listen((req,res)=>{
    counts.provider++;
    const expected=env.NICEHASH_TEST_API_KEY+':'+signReadRequest({key:env.NICEHASH_TEST_API_KEY,
      secret:env.NICEHASH_TEST_API_SECRET,organizationId:env.NICEHASH_TEST_ORGANIZATION_ID,
      time:req.headers['x-time'],nonce:req.headers['x-nonce'],path:req.url});
    if(mode.providerDenied||req.method!=='GET'||req.headers['x-auth']!==expected||req.headers['x-organization-id']!==env.NICEHASH_TEST_ORGANIZATION_ID)
      return output(res,401,{error:'fixture auth failure'});
    if(req.url==='/main/api/v2/hashpower/myOrders')return output(res,200,{list:[{id:ORDER_ID,algorithm:'SHA256ASICBOOST'}]});
    if(req.url===`/main/api/v2/hashpower/order/${ORDER_ID}/stats`)return output(res,200,{stats:[]});
    return output(res,404,{});
  });
  const counterHandler=createHandler(store,{auth:{sessionPrincipal:()=>null,can:()=>false},
    sandboxEnv:{...env,NEO_COUNTER_SANDBOX_ENABLED:'true'},sandboxNow:()=>NOW});
  const counter=await listen((req,res)=>{counts.counter++;return counterHandler(req,res);});
  const observer=await listen((req,res)=>{
    counts.observer++;
    if(req.method!=='GET')return output(res,405,{});
    if(req.url==='/tx/'+TX)return output(res,200,{txid:TX,vin:[{is_coinbase:false}],
      vout:[{scriptpubkey:invoice.scriptPubKey,value:mode.badAmount?999:1000}],
      status:{confirmed:true,block_height:100,block_hash:BLOCK}});
    if(req.url==='/tx/'+TX+'/status')return output(res,200,{confirmed:!mode.reorg,block_height:100,block_hash:BLOCK});
    res.writeHead(200,{'content-type':'text/plain'});
    if(req.url==='/blocks/tip/height')return res.end('102');
    if(req.url==='/block-height/100')return res.end(mode.reorg?'f'.repeat(64):BLOCK);
    return res.end('invalid fixture route');
  });
  env.NEO_COUNTER_SANDBOX_ALLOWED_ORIGIN=counter.base;
  env.NEO_COUNTER_SANDBOX_EMITTER_URL=counter.base+'/sandbox/cloud-miner/receipt-candidate';
  const fetchImpl=async(url,init)=>{
    assert.equal(init.redirect,'error');
    if(url.startsWith('https://api-test.nicehash.com/'))return fetch(provider.base+new URL(url).pathname,init);
    if(url.startsWith('https://blockstream.info/testnet/api/'))return fetch(observer.base+url.slice('https://blockstream.info/testnet/api'.length),init);
    if(url===env.NEO_COUNTER_SANDBOX_EMITTER_URL) {
      assert.equal(init.headers.authorization,'Bearer '+TOKEN);
      assert.deepEqual(JSON.parse(init.body),{orderId:invoice.orderId,txid:TX,vout:0});
      const response=await fetch(url,init);
      if(mode.badSignature||mode.pretendPaid) {
        const value=await response.json();
        if(mode.badSignature)value.signature='sha256='+'0'.repeat(64);
        if(mode.pretendPaid)value.paymentVerified=true;
        return Response.json(value);
      }
      return response;
    }
    throw Error('unexpected outbound network target');
  };
  try {await fn({env,counts,mode,store,run:()=>runSandboxAcceptance({env,fetchImpl,now:()=>NOW})});}
  finally {
    for(const service of [provider,counter,observer]) {service.server.closeAllConnections();await new Promise(r=>service.server.close(r));}
    store.close();cfg.clean();
  }
}

for (const endpoint of [
  'http://example.com/sandbox/cloud-miner/receipt-candidate',
  'http://localhost:8787/sandbox/cloud-miner/receipt-candidate',
  'http://2130706433:8787/sandbox/cloud-miner/receipt-candidate',
  'https://trusted.example/sandbox/cloud-miner/receipt-candidate?token=bad',
  'https://trusted.example/sandbox/cloud-miner/receipt-candidate#fragment',
  'https://user:password@trusted.example/sandbox/cloud-miner/receipt-candidate',
  'https://trusted.example/elsewhere',
  'https://evil.example/sandbox/cloud-miner/receipt-candidate'
]) test('rejects unsafe or unapproved Counter endpoint: '+endpoint,()=>{
  assert.throws(()=>acceptanceEndpoint({NEO_COUNTER_SANDBOX_EMITTER_URL:endpoint,NEO_COUNTER_SANDBOX_ALLOWED_ORIGIN:'https://trusted.example'}));
});

test('preflight accepts canonical approved HTTPS and loopback endpoints',()=>{
  for(const origin of ['https://counter.example','http://127.0.0.1:8787','http://[::1]:8787'])
    assert.equal(acceptanceEndpoint({NEO_COUNTER_SANDBOX_EMITTER_URL:origin+'/sandbox/cloud-miner/receipt-candidate',NEO_COUNTER_SANDBOX_ALLOWED_ORIGIN:origin}),origin+'/sandbox/cloud-miner/receipt-candidate');
});

test('preflight missing credentials is sanitized, fail-closed and performs no network or creation',()=>{
  const r=preflight({}); assert.equal(r.status,'BLOCKED'); assert.equal(r.gatePassed,false);
  assert.equal(r.networkRequestsMade,false);assert.ok(r.missing.includes('NICEHASH_TEST_API_KEY'));
});

test('complete preflight validates files but neither authenticates nor creates a ledger',()=>{
  const cfg=localConfig();try {
    const r=preflight(cfg.env);assert.equal(r.configured,true);assert.equal(r.status,'CONFIGURED_NOT_AUTHENTICATED');
    assert.equal(r.paymentVerified,false);assert.equal(r.gatePassed,false);assert.equal(r.durableVolumeVerified,false);
    assert.equal(existsSync(cfg.env.NEO_CLOUD_SANDBOX_LEDGER_PATH),false);
    const raw=JSON.stringify(r);for(const secret of [TOKEN,SECRET,invoice.customerId,TX,cfg.dir])assert.equal(raw.includes(secret),false);
  }finally{cfg.clean();}
});

for(const mutation of ['shared_parent','world_readable_invoice','symlink_invoice','hardlink_invoice','oversized_invoice','foreign_database','ledger_symlink','wrong_merchant','wrong_order','mainnet','reused_secret','wrong_reference','unexpected_reference_fields'])
  test('preflight refuses '+mutation,()=>{
    const cfg=localConfig(),{env}=cfg;try {
      if(mutation==='shared_parent')chmodSync(cfg.dir,0o755);
      if(mutation==='world_readable_invoice')chmodSync(env.NEO_COUNTER_SANDBOX_ORDER_FILE,0o644);
      if(mutation==='symlink_invoice'){const dest=join(cfg.dir,'link.json');symlinkSync(env.NEO_COUNTER_SANDBOX_ORDER_FILE,dest);env.NEO_COUNTER_SANDBOX_ORDER_FILE=dest;}
      if(mutation==='hardlink_invoice')linkSync(env.NEO_COUNTER_SANDBOX_ORDER_FILE,join(cfg.dir,'alias.json'));
      if(mutation==='oversized_invoice')writeFileSync(env.NEO_COUNTER_SANDBOX_ORDER_FILE,' '.repeat(17000));
      if(mutation==='foreign_database'){const db=new DatabaseSync(env.NEO_CLOUD_SANDBOX_LEDGER_PATH);db.exec('CREATE TABLE wallet_balances(id TEXT)');db.close();chmodSync(env.NEO_CLOUD_SANDBOX_LEDGER_PATH,0o600);}
      if(mutation==='ledger_symlink')symlinkSync(env.NEO_COUNTER_SANDBOX_ORDER_FILE,env.NEO_CLOUD_SANDBOX_LEDGER_PATH);
      if(mutation==='wrong_merchant')env.NEO_COUNTER_SANDBOX_MERCHANT_ID='another-merchant';
      if(mutation==='wrong_order')env.NICEHASH_TEST_ORDER_ID='00000000-0000-4000-8000-000000000002';
      if(mutation==='mainnet')writeFileSync(env.NEO_COUNTER_SANDBOX_ORDER_FILE,JSON.stringify({...invoice,network:'mainnet'}));
      if(mutation==='reused_secret')env.NEO_COUNTER_SANDBOX_RECEIPT_SECRET=TOKEN;
      if(mutation==='wrong_reference')writeFileSync(env.NEO_COUNTER_SANDBOX_TRANSACTION_FILE,JSON.stringify({txid:TX,vout:-1}));
      if(mutation==='unexpected_reference_fields')writeFileSync(env.NEO_COUNTER_SANDBOX_TRANSACTION_FILE,JSON.stringify({txid:TX,vout:0,amountSats:1000}));
      assert.equal(preflight(env).configured,false);
    }finally{cfg.clean();}
  });

test('three real loopback servers complete the pipeline; injected evidence never passes the real gate',()=>exercise(async({run,counts,env})=>{
  const r=await run();assert.equal(r.integrationChecksPassed,true);assert.equal(r.providerAuthenticated,true);
  assert.equal(r.candidateAuthenticated,true);assert.equal(r.paymentVerified,true);assert.equal(r.confirmations,3);
  assert.equal(r.gatePassed,false);assert.equal(r.externalEvidenceVerified,false);
  assert.equal(r.status,'FIXTURE_INTEGRATION_PASSED_NOT_EXTERNAL_PROOF');
  assert.deepEqual(counts,{provider:2,counter:1,observer:4});
  for(const flag of ['purchasesEnabled','contractActivationEnabled','tokenIssuanceEnabled','mainnetSettlementEnabled'])assert.equal(r[flag],false);
  const raw=JSON.stringify(r);for(const secret of [TOKEN,SECRET,TX,ORDER_ID,invoice.customerId,env.NICEHASH_TEST_API_KEY])assert.equal(raw.includes(secret),false);
}));

test('explicit operator approval is required before any request or ledger write',()=>exercise(async({run,counts,env})=>{
  delete env.NEO_CLOUD_SANDBOX_ACCEPTANCE_APPROVED;
  const r=await run();assert.deepEqual(r.blockers,['OPERATOR_ACCEPTANCE_APPROVAL_REQUIRED']);
  assert.deepEqual(counts,{provider:0,counter:0,observer:0});assert.equal(existsSync(env.NEO_CLOUD_SANDBOX_LEDGER_PATH),false);
}));

test('failed provider authentication prevents Counter POST and database creation',()=>exercise(async({run,counts,env})=>{
  const r=await run();assert.deepEqual(r.blockers,['AUTHENTICATED_PROVIDER_ORDER_REQUIRED']);
  assert.equal(counts.counter,0);assert.equal(counts.observer,0);assert.equal(existsSync(env.NEO_CLOUD_SANDBOX_LEDGER_PATH),false);
},{providerDenied:true}));

for(const mode of ['badSignature','pretendPaid','provision']) test('untrusted Counter candidate is rejected: '+mode,()=>exercise(async({run,counts,env})=>{
  const r=await run();assert.equal(r.paymentVerified,false);assert.equal(r.integrationChecksPassed,false);
  assert.deepEqual(r.blockers,['COUNTER_CANDIDATE_NOT_AUTHENTICATED']);
  assert.equal(counts.observer,0);assert.equal(existsSync(env.NEO_CLOUD_SANDBOX_LEDGER_PATH),false);
},mode==='provision'?{provision:false}:{[mode]:true}));

test('signed candidate is not sufficient: independent observer must match the amount',()=>exercise(async({run})=>{
  const r=await run();assert.equal(r.candidateAuthenticated,true);assert.equal(r.paymentVerified,false);
  assert.deepEqual(r.blockers,['INDEPENDENT_TEST_PAYMENT_NOT_VERIFIED']);
},{badAmount:true}));

test('ledger reopening retains idempotency but a reorg invalidates the next attempt',()=>exercise(async({run,mode,counts,store})=>{
  const first=await run();assert.equal(first.replayed,false);
  const second=await run();assert.equal(second.replayed,true);assert.equal(second.paymentVerified,true);
  assert.equal(store.listEvents(invoice.merchantId).filter(e=>e.type==='sandbox.cloud-miner.receipt-candidate').length,1);
  mode.reorg=true;const third=await run();assert.equal(third.paymentVerified,false);
  assert.equal(third.integrationChecksPassed,false);assert.equal(third.gatePassed,false);
  assert.equal(counts.observer,12);
}));

test('CLI defaults to preflight, returns exit 2 without secrets and refuses arbitrary flags',()=>{
  const script=fileURLToPath(new URL('./cloudSandboxAcceptance.mjs',import.meta.url));
  for(const args of [[],['--preflight'],['--run'],['--purchase']]) {
    const result=spawnSync(process.execPath,[script,...args],{encoding:'utf8',env:{PATH:process.env.PATH},timeout:10000});
    assert.equal(result.status,2);const output=JSON.parse(result.stdout);
    assert.equal(output.gatePassed,false);assert.equal(output.purchasesEnabled,false);
  }
});
