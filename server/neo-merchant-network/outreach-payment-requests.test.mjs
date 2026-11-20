import test from 'node:test';
import assert from 'node:assert/strict';
import {createOutreachRequestService,btcAmountString,renderOutreachCheckout} from './outreach-payment-requests.mjs';
const clock=new Date('2026-11-11T20:00:00Z');
const address='1BoatSLRHtKNngkdXEeobR76b53LETtpyT'; // Public fixture only. Not a receiving wallet.
const binding={bindingId:'temple-receive-01',address,network:'bitcoin-mainnet',status:'VERIFIED',controller:'NEO_ORGANIZATION',controlProofRef:'proof-fixture-2026'};
const txid='a'.repeat(64),blockHash='b'.repeat(64);
const donation={channel:'TEMPLE',campaignRef:'campaign-fixture-01',walletBindingId:binding.bindingId,idempotencyKey:'donation_fixture_00000001'};
const sale={channel:'SALES',campaignRef:'sale-fixture-01',leadRef:'lead-fixture-01',orderRef:'order-fixture-01',walletBindingId:binding.bindingId,amountSats:125000,idempotencyKey:'sale_fixture_000000001'};
const service=(overrides={})=>createOutreachRequestService({walletBindings:[binding],now:()=>clock,uuid:()=> 'test-request',...overrides});
test('fixed-price sale generates Bitcoin BIP21 link without sending funds',()=>{
 const r=service().prepare(sale);
 assert.equal(r.purpose,'SALE');
 assert.equal(r.amountBtc,'0.00125');
 assert.equal(r.qrPayload,'bitcoin:'+address+'?amount=0.00125&label=NEO%20Sales%20payment');
 assert.equal(r.status,'AWAITING_PAYMENT');
 assert.equal(r.controls.autoSend,false);
 assert.equal(r.observedTransaction,null);
});
test('open-amount Temple donation has no false tax status',()=>{
 const r=service().prepare(donation);
 assert.equal(r.amountBtc,null);
 assert.equal(r.qrPayload,'bitcoin:'+address+'?label=NEO%20Temple%20donation');
 assert.equal(JSON.stringify(r).includes('tax-deductible'),false);
});
test('idempotency supports retries, rejects changed requests',()=>{
 const svc=service(),r=svc.prepare(donation);
 assert.deepEqual(svc.prepare(donation),r);
 assert.throws(()=>svc.prepare({...donation,amountSats:45000}),/idempotency_key_conflict/);
});
test('one verified address cannot be recycled for simultaneous payments',()=>{
 const svc=service();svc.prepare(donation);
 assert.throws(()=>svc.prepare({...donation,idempotencyKey:'donation_fixture_00000002'}),/already_reserved/);
});
test('rejects unverified/personal wallet bindings and malformed forms',()=>{
 for(const changed of [{status:'PENDING'},{controller:'AGENT_PERSONAL'},{address:'invalid'},{network:'testnet'}]){
  assert.throws(()=>createOutreachRequestService({walletBindings:[{...binding,...changed}]}),/verified_organization_wallet_binding_required/);
 }
 const svc=service();
 for(const input of [{...sale,amountSats:0},{...sale,amountSats:0.5},{...sale,amountSats:undefined},{...donation,orderRef:'sale-order'},{...sale,orderRef:undefined},{...donation,donorEmail:'private@example.com'},{...donation,campaignRef:'https://trello.com/user'}]){
  assert.throws(()=>svc.prepare(input));
 }
});
test('payment cannot become settled without a trusted server verifier',async()=>{
 const svc=service(),r=svc.prepare(sale);
 await assert.rejects(svc.observe(r.requestId,txid),/trusted_verifier_required/);
 assert.equal(svc.get(r.requestId).status,'AWAITING_PAYMENT');
});
test('verified confirmations transition pending to settled after threshold',async()=>{
 let confirmations=1;
 const svc=service({verifyInclusion:async ({txid:asked,address:dest})=>({
 txid:asked,blockHash,network:'bitcoin-mainnet',recipientAddress:dest,receivedSats:125000,
 confirmations,inclusionVerified:true,uniqueOutputMatch:true
 })});
 const r=svc.prepare(sale);
 assert.equal((await svc.observe(r.requestId,txid)).status,'AWAITING_CONFIRMATIONS');
 confirmations=3;
 assert.equal((await svc.observe(r.requestId,txid)).status,'SETTLED_VERIFIED');
});
test('recipient, amount, inclusion proof and output uniqueness cannot be spoofed through observation',async()=>{
 for(const broken of [{recipientAddress:'1BadAddress'},{receivedSats:100000},{inclusionVerified:false},{uniqueOutputMatch:false},{blockHash:'invalid'}]){
  const svc=service({verifyInclusion:async ({txid:asked,address:dest})=>({
   txid:asked,blockHash,network:'bitcoin-mainnet',recipientAddress:dest,receivedSats:125000,
   confirmations:8,inclusionVerified:true,uniqueOutputMatch:true,...broken
  })});
  const r=svc.prepare(sale);
  await assert.rejects(svc.observe(r.requestId,txid));
  assert.equal(svc.get(r.requestId).status,'AWAITING_PAYMENT');
 }
});
test('expired request remains reserved, preventing false attribution',()=>{
 let current=new Date('2026-11-11T20:00:00Z');
 const svc=service({now:()=>current});
 const r=svc.prepare({...donation,expiresHours:1});
 current=new Date('2026-11-12T02:00:00Z');
 assert.equal(svc.expire(r.requestId).status,'EXPIRED');
 assert.throws(()=>svc.prepare({...donation,idempotencyKey:'donation_fixture_00000003'}),/already_reserved/);
});
test('checkout does not expose internal campaign, lead or order data',()=>{
 const page=renderOutreachCheckout(service().prepare(sale));
 assert.match(page,/Open Bitcoin wallet/);
 assert.match(page,/viewport/);
 assert.doesNotMatch(page,/lead-fixture|order-fixture|sale-fixture|privateKey|seedPhrase/);
});
test('satoshis render accurately without floats',()=>{
 assert.equal(btcAmountString(1000),'0.00001');
 assert.equal(btcAmountString(100000000),'1');
 assert.equal(btcAmountString(2100000000000000),'21000000');
});
