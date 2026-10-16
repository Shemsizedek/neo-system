import test from 'node:test';
import assert from 'node:assert/strict';
import { createInMemoryCrmStore } from '../neo-platform-api/crm-store.mjs';
import { createDealDeskRuntime } from './runtime.mjs';

test('Wave 1 seeds deterministic CRM records idempotently',async()=>{
  const store=createInMemoryCrmStore({now:()=> '2026-10-16T16:00:00.000Z'});
  const runtime=createDealDeskRuntime({crmStore:store,now:()=> '2026-10-16T16:00:00.000Z'});
  const first=await runtime.ensureWave1Crm();
  const count1=(await store.list()).length;
  const second=await runtime.ensureWave1Crm();
  const count2=(await store.list()).length;
  assert.equal(first.prospects,2);
  assert.equal(second.prospects,2);
  assert.equal(count1,count2);
  assert.ok((await store.list({type:'lead'})).length>=2);
});

test('Wave 1 is draft-only and commercially classified',async()=>{
  const store=createInMemoryCrmStore();
  const runtime=createDealDeskRuntime({crmStore:store,now:()=> '2026-10-16T16:00:00.000Z'});
  const snapshot=await runtime.snapshot();
  assert.equal(snapshot.liveSendEnabled,false);
  assert.equal(snapshot.prospects.length,2);
  assert.ok(snapshot.prospects.every(x=>x.opportunity.dealClass!=='equity_investment'));
  assert.ok(snapshot.outreach.every(x=>['draft_ready','approval_required'].includes(x.sendState)));
});

test('dashboard renders Wave 1 prospects',async()=>{
  const store=createInMemoryCrmStore();
  const runtime=createDealDeskRuntime({crmStore:store,now:()=> '2026-10-16T16:00:00.000Z'});
  const html=await runtime.dashboardHtml();
  assert.match(html,/NEO Deal Desk/);
  assert.match(html,/Episcopal Diocese of Texas/);
  assert.match(html,/Weil, Gotshal/);
});
