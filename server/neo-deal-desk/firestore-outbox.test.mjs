import test from 'node:test';
import assert from 'node:assert/strict';
import { createInMemoryDealDeskOutbox } from './outbound.mjs';

test('outbox contract preserves replies after sent state',async()=>{
  const outbox=createInMemoryDealDeskOutbox({now:()=> '2026-10-16T17:30:00.000Z'});
  await outbox.ensureSeed([{id:'wave1:1',prospectId:'p1',prospect:'Example',status:'draft_ready'}]);
  await outbox.approve('wave1:1','admin');
  await outbox.markSent('wave1:1','admin',{provider:'test',messageId:'m1'});
  const replied=await outbox.recordReply('wave1:1','mail',{classification:'positive_interest',summary:'Interested in a call.',source:'test'});
  assert.equal(replied.status,'replied');
  assert.equal(replied.reply.classification,'positive_interest');
  const events=await outbox.events();
  assert.equal(events[0].type,'replied');
});
