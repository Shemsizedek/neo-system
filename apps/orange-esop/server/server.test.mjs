import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { JsonEsopStore } from './store.mjs';
import { createOrangeEsopServer } from './server.mjs';

const roleTokens={
  AUDITOR:'audit-secret',
  SECRETARY:'secretary-secret',
  TREASURER:'treasurer-secret',
  PLAN_ADMINISTRATOR:'admin-secret',
  ESOP_TRUSTEE:'trustee-secret'
};
const auth=(role, token=roleTokens[role])=>({'x-neo-role':role,'x-neo-role-token':token});

async function withServer(fn){
  const dir=await mkdtemp(path.join(os.tmpdir(),'orange-esop-'));
  const server=createOrangeEsopServer({store:new JsonEsopStore({file:path.join(dir,'db.json')}),roleTokens});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${server.address().port}`;
  try { await fn(base); } finally { await new Promise(r=>server.close(r)); }
}

test('health and sanitized public summary are public while roster is protected', async()=>withServer(async base=>{
  assert.equal((await fetch(`${base}/health`)).status,200);
  const summary=await fetch(`${base}/api/esop/public-summary`);
  assert.equal(summary.status,200);
  assert.equal((await fetch(`${base}/api/esop/dashboard`)).status,403);
  assert.equal((await fetch(`${base}/api/esop/dashboard`,{headers:auth('AUDITOR','wrong')})).status,401);
  assert.equal((await fetch(`${base}/api/esop/dashboard`,{headers:auth('AUDITOR')})).status,200);
}));

test('participant creation persists only with matching server-side role token', async()=>withServer(async base=>{
  const bad=await fetch(`${base}/api/esop/participants`,{method:'POST',headers:{'content-type':'application/json',...auth('SECRETARY','wrong')},body:JSON.stringify({participantId:'NEO-PART-2026-0001',employmentStatus:'active',adeptStatus:true})});
  assert.equal(bad.status,401);
  const r=await fetch(`${base}/api/esop/participants`,{method:'POST',headers:{'content-type':'application/json',...auth('SECRETARY')},body:JSON.stringify({participantId:'NEO-PART-2026-0001',employmentStatus:'active',adeptStatus:true})});
  assert.equal(r.status,201);
  const list=await fetch(`${base}/api/esop/participants`,{headers:auth('AUDITOR')}).then(r=>r.json());
  assert.equal(list.items.length,1);
}));

test('reconciliation can return hold', async()=>withServer(async base=>{
  const r=await fetch(`${base}/api/esop/reconcile`,{method:'POST',headers:{'content-type':'application/json',...auth('TREASURER')},body:JSON.stringify({reserveUnits:'1000',suspenseUnits:'200',participantUnits:'700',unusedAuthorizedUnits:'100',representedUnderlyingInterest:'1100',documentedUnderlyingInterest:'1000'})});
  assert.equal(r.status,409);
  assert.equal((await r.json()).status,'RECONCILIATION_HOLD');
}));

test('certificate issuance fails closed until authoritative plan data is wired', async()=>withServer(async base=>{
  const r=await fetch(`${base}/api/esop/certificate`,{method:'POST',headers:{'content-type':'application/json',...auth('ESOP_TRUSTEE')},body:'{}'});
  assert.equal(r.status,409);
  assert.equal((await r.json()).error,'AUTHORITATIVE_PLAN_DATA_NOT_AVAILABLE');
}));
