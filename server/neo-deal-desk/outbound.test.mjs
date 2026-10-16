import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWave1Outbox, createDealDeskOutboundService, createInMemoryDealDeskOutbox } from './outbound.mjs';

const snapshot={campaign:'NEO-DEALDESK-004',wave:1,prospects:[{normalized:{organization:'Example Org',decisionMakerName:'A Person',decisionAuthority:'CIO',publicContactUrl:'https://example.org/contact'},opportunity:{dealClass:'institutional_saas',quote:{ask:100000,approvalRequired:false}}}],outreach:[{prospect:'Example Org',decisionMaker:'A Person',decisionRole:'CIO',channel:'public_business_contact_route',publicContactUrl:'https://example.org/contact',subject:'NEO System opportunity for Example Org',sourceUrls:['https://example.org/about'],sendState:'draft_ready'}]};

test('builds deterministic Wave 1 outbox items',()=>{
  const items=buildWave1Outbox(snapshot);
  assert.equal(items.length,1);
  assert.equal(items[0].status,'draft_ready');
  assert.equal(items[0].securitiesRelated,false);
});

test('cannot dispatch before approval or while execution disabled',async()=>{
  const outbox=createInMemoryDealDeskOutbox({now:()=> '2026-10-16T17:00:00.000Z'});
  const service=createDealDeskOutboundService({outbox,executionEnabled:false});
  await service.seed(snapshot);
  await assert.rejects(()=>service.dispatch('wave1:1',{actor:'admin'}),/outbox_item_not_approved/);
  await service.approve('wave1:1',{actor:'admin'});
  await assert.rejects(()=>service.dispatch('wave1:1',{actor:'admin'}),/outbound_execution_disabled/);
});

test('approved commercial item dispatches through configured adapter',async()=>{
  const sent=[];
  const outbox=createInMemoryDealDeskOutbox({now:()=> '2026-10-16T17:00:00.000Z'});
  const service=createDealDeskOutboundService({outbox,executionEnabled:true,mailAdapter:{send:async msg=>{sent.push(msg);return {provider:'test',messageId:'m1'}}}});
  await service.seed(snapshot);
  await service.approve('wave1:1',{actor:'admin'});
  const item=await service.dispatch('wave1:1',{actor:'admin'});
  assert.equal(item.status,'sent');
  assert.equal(sent.length,1);
});

test('compliance-gated item requires explicit compliance approval',async()=>{
  const gated={...snapshot,prospects:[{normalized:snapshot.prospects[0].normalized,opportunity:{dealClass:'equity_investment',quote:{approvalRequired:true}}}],outreach:[{...snapshot.outreach[0],sendState:'approval_required'}]};
  const outbox=createInMemoryDealDeskOutbox();
  const service=createDealDeskOutboundService({outbox});
  await service.seed(gated);
  await assert.rejects(()=>service.approve('wave1:1',{actor:'admin'}),/compliance_approval_required/);
});
