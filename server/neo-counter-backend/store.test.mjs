import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, VersionConflictError } from './store.mjs';

test('merchant sync increments versions and rejects stale writes',()=>{
  const store=createStore(':memory:');
  const base={id:'merchant_ops:merchant_144',entity:'merchant_ops',merchantId:'merchant_144',terminalId:'terminal_a',version:0,updatedAt:new Date().toISOString(),payload:{merchant:{id:'merchant_144'}}};
  const first=store.putEnvelope(base);
  assert.equal(first.version,1);
  assert.equal(store.getState('merchant_144').version,1);
  assert.throws(()=>store.putEnvelope(base),error=>error instanceof VersionConflictError && error.remote.version===1);
  store.close();
});

test('event ledger persists terminal-scoped events',()=>{
  const store=createStore(':memory:');
  const event=store.appendEvent({merchantId:'merchant_144',terminalId:'terminal_a',entity:'transaction',type:'transaction.settled',payload:{paymentId:'neo_pi_1'}});
  const events=store.listEvents('merchant_144');
  assert.equal(events.length,1);
  assert.equal(events[0].id,event.id);
  assert.equal(events[0].type,'transaction.settled');
  assert.equal(events[0].payload.paymentId,'neo_pi_1');
  store.close();
});
