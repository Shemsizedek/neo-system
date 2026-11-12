import test from 'node:test';
import assert from 'node:assert/strict';
import {createTrelloCounterpayBridge,projectTrelloOpportunity,FAMILY_OFFICE_BOARD} from './trello-counterpay-bridge.mjs';
import {createOutreachRequestService,renderOutreachCheckout} from './outreach-payment-requests.mjs';

const clock=new Date('2026-11-11T18:00:00Z');
const ACTIVE='ari:cloud:trello::list/workspace/6440292a287e321c1e592283/6a7e1fff8b4402f0c94c4436';
const CLOSING='ari:cloud:trello::list/workspace/6440292a287e321c1e592283/6a7e2008898704eff86875e5';
const INTAKE='ari:cloud:trello::list/workspace/6440292a287e321c1e592283/6a7e1fe259cf4ea05f978b22';
const card={id:'ari:cloud:trello::card/workspace/6440292a287e321c1e592283/'+'a'.repeat(24),
  boardId:FAMILY_OFFICE_BOARD,listId:ACTIVE,closed:false,name:'Sensitive Customer Company',description:'PRIVATE: name@example.com'};
const wallet={bindingId:'test-org-wallet-01',address:'1BoatSLRHtKNngkdXEeobR76b53LETtpyT',network:'bitcoin-mainnet',status:'VERIFIED',controller:'NEO_ORGANIZATION',controlProofRef:'control-fixture-01'};
const approvedDonation={
  decision:'APPROVED',approvalId:'approval-fixture-01',cardId:card.id,
  channel:'TEMPLE',purpose:'VOLUNTARY_DONATION',consentConfirmed:true,legalReview:'CLEARED',
  campaignRef:'campaign-fixture-01',walletBindingId:wallet.bindingId,amountSats:null,orderRef:null,
  expiresAt:'2026-11-12T18:00:00.000Z'
};
const approvedSale={...approvedDonation,channel:'SALES',purpose:'COMMERCIAL_SERVICE_SALE',amountSats:125000,orderRef:'order-fixture-01'};
function harness(approval=approvedDonation,overrides={}){
  const payments=createOutreachRequestService({walletBindings:[wallet],now:()=>clock,uuid:()=> 'request-fixture-01'});
  const bridge=createTrelloCounterpayBridge({resolveApproval:async()=>approval,paymentRequests:payments,
    hmacKey:Buffer.alloc(32,7),now:()=>clock,...overrides});
  return {bridge,payments};
}
test('projects only opaque card identity/stage; drops personal information',()=>{
  const p=projectTrelloOpportunity(card);
  assert.deepEqual(Object.keys(p),['cardId','stage']);
  assert.doesNotMatch(JSON.stringify(p),/Sensitive|PRIVATE|example.com/);
});
test('only source-authorized board and vetted pipeline stages are eligible',async()=>{
  const {bridge}=harness();
  for(const bad of [{...card,boardId:'other'}, {...card,listId:INTAKE},{...card,closed:true},{...card,id:'bad'}]){
    assert.equal((await bridge.prepareApprovedRequest({card:bad,approvalRef:'approval-fixture-01'})).ready,false);
  }
});
test('approved Temple donation prepares an inbound Bitcoin request, not a transfer',async()=>{
  const {bridge}=harness();
  const out=await bridge.prepareApprovedRequest({card,approvalRef:'approval-fixture-01'});
  assert.equal(out.ready,true);
  assert.equal(out.request.purpose,'DONATION');
  assert.equal(out.request.amountBtc,null);
  assert.equal(out.request.status,'AWAITING_PAYMENT');
  assert.equal(out.request.controls.autoSend,false);
  assert.equal(out.request.controls.broadcast,false);
  assert.ok(out.request.leadRef.startsWith('tr:'));
  assert.doesNotMatch(JSON.stringify(out),/Sensitive Customer|name@example.com/);
  assert.doesNotMatch(renderOutreachCheckout(out.request),/approval-fixture|campaign-fixture|name@example.com/);
});
test('approved sale is payable only at Closing with a fixed satoshi amount',async()=>{
  const {bridge}=harness(approvedSale);
  assert.equal((await bridge.prepareApprovedRequest({card,approvalRef:'approval-fixture-01'})).reason,'sales_closing_stage_required');
  const out=await bridge.prepareApprovedRequest({card:{...card,listId:CLOSING},approvalRef:'approval-fixture-01'});
  assert.equal(out.ready,true);assert.equal(out.request.amountSats,125000);assert.equal(out.request.purpose,'SALE');
});
test('human-approved mandate must match card and explicit consent',async()=>{
  for(const invalid of [
    {...approvedDonation,consentConfirmed:false},
    {...approvedDonation,decision:'PENDING'},
    {...approvedDonation,cardId:'wrong'},
    {...approvedDonation,legalReview:'UNREVIEWED'},
    {...approvedDonation,secret:'oops'},
    {...approvedDonation,channel:'SALES'},
    {...approvedDonation,purpose:'INVESTMENT'}
  ]) {
    const out=await harness(invalid).bridge.prepareApprovedRequest({card,approvalRef:'approval-fixture-01'});
    assert.equal(out.ready,false);
    assert.equal(out.paymentCreated,false);
  }
});
test('expired and overly long mandates fail closed',async()=>{
  for(const expiresAt of ['2026-11-10T18:00:00Z','2027-01-01T18:00:00Z','garbage']){
    const out=await harness({...approvedDonation,expiresAt}).bridge.prepareApprovedRequest({card,approvalRef:'approval-fixture-01'});
    assert.equal(out.ready,false);
  }
});
test('untrusted/failed mandate resolution cannot create a payment',async()=>{
  const payments=createOutreachRequestService({walletBindings:[wallet],now:()=>clock});
  const bridge=createTrelloCounterpayBridge({resolveApproval:async()=>{throw Error('private token');},paymentRequests:payments,hmacKey:Buffer.alloc(32,7),now:()=>clock});
  const out=await bridge.prepareApprovedRequest({card,approvalRef:'approval-fixture-01'});
  assert.equal(out.ready,false);
  assert.doesNotMatch(JSON.stringify(out),/private token/);
});
test('retries are idempotent without reserving a second address',async()=>{
  const {bridge}=harness();
  const a=await bridge.prepareApprovedRequest({card,approvalRef:'approval-fixture-01'});
  const b=await bridge.prepareApprovedRequest({card,approvalRef:'approval-fixture-01'});
  assert.deepEqual(a,b);
});
test('no verified organizational wallet means no request can be issued',async()=>{
  const empty=createOutreachRequestService({walletBindings:[],now:()=>clock});
  const bridge=createTrelloCounterpayBridge({resolveApproval:async()=>approvedDonation,paymentRequests:empty,hmacKey:Buffer.alloc(32,7),now:()=>clock});
  const out=await bridge.prepareApprovedRequest({card,approvalRef:'approval-fixture-01'});
  assert.equal(out.reason,'verified_wallet_or_payment_request_unavailable');
});
test('bridge requires trusted approval resolver, private key and payment service',()=>{
  assert.throws(()=>createTrelloCounterpayBridge({resolveApproval:()=>{},paymentRequests:{prepare:()=>{}},hmacKey:Buffer.alloc(8)}),/trusted_bridge_dependencies_required/);
  assert.throws(()=>createTrelloCounterpayBridge({resolveApproval:()=>{},hmacKey:Buffer.alloc(32)}),/trusted_bridge_dependencies_required/);
});
