import test from 'node:test';
import assert from 'node:assert/strict';
import { createInMemoryOutreachStore } from './outreach-store.mjs';
import { approveOutreach, classifyReply, composeOutreach, handoffOutreach, recordDelivery, recordReply } from './outbound.mjs';

function prepared({investor=false}={}){
  return {
    normalized:{organization:investor?'Example Capital':'Example University',decisionMakerName:'Alex Public',decisionAuthority:'CIO',publicContactUrl:'https://example.org/contact',intent:'AI modernization'},
    opportunity:{dealClass:investor?'equity_investment':'institutional_saas',quote:{approvalReasons:investor?['securities_solicitation','equity_terms']:[]}}
  };
}

test('commercial outreach must be explicitly approved before provider handoff',async()=>{
  const store=createInMemoryOutreachStore({now:()=> '2026-10-16T17:00:00Z'});
  const created=await store.create(composeOutreach(prepared()));
  await assert.rejects(()=>handoffOutreach(store,created.id),/not_approved/);
  const approved=await approveOutreach(store,created.id,{actor:'executive-admin'});
  assert.equal(approved.status,'approved');
  const handed=await handoffOutreach(store,created.id,{providerRef:'neo-mail:msg-1'});
  assert.equal(handed.status,'awaiting_provider');
});

test('securities outreach requires explicit compliance approval',async()=>{
  const store=createInMemoryOutreachStore();
  const created=await store.create(composeOutreach(prepared({investor:true})));
  assert.equal(created.status,'pending_approval');
  await assert.rejects(()=>approveOutreach(store,created.id,{actor:'executive-admin'}),/compliance/);
  const approved=await approveOutreach(store,created.id,{actor:'executive-admin',complianceApproved:true});
  assert.equal(approved.status,'approved');
});

test('provider delivery and reply classification advance state',async()=>{
  const store=createInMemoryOutreachStore();
  const created=await store.create(composeOutreach(prepared()));
  await approveOutreach(store,created.id,{actor:'executive-admin'});
  await handoffOutreach(store,created.id,{providerRef:'neo-mail:msg-2'});
  const delivered=await recordDelivery(store,created.id,{outcome:'delivered',receipt:{messageId:'msg-2'}});
  assert.equal(delivered.status,'delivered');
  const replied=await recordReply(store,created.id,{text:'This is interesting. Let’s schedule a call next week.'});
  assert.equal(replied.status,'replied');
  assert.equal(replied.replyClassification,'positive_interest');
});

test('reply classifier recognizes opt-out and pricing objections',()=>{
  assert.equal(classifyReply('Please unsubscribe me from future messages.'),'unsubscribe');
  assert.equal(classifyReply('The price is outside our budget.'),'objection_budget');
});
