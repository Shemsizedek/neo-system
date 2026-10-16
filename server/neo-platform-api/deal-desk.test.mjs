import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createNeoPlatformApi } from './server.mjs';
import { createInMemoryCrmStore } from './crm-store.mjs';

async function withServer(fn,{crmStore=createInMemoryCrmStore()}={}){
  const subjectResolver=req=>req.headers.authorization?.replace('Bearer ','')||null;
  const authService={session:async subject=>({subject,displayName:subject,role:subject==='admin'?'executive-admin':'member',neopassStatus:'active'})};
  const server=createNeoPlatformApi({now:()=> '2026-10-16T16:00:00.000Z',subjectResolver,authService,crmStore});
  server.listen(0,'127.0.0.1');
  await once(server,'listening');
  const {port}=server.address();
  try{await fn(`http://127.0.0.1:${port}`,crmStore)}finally{server.close();await once(server,'close')}
}

test('Deal Desk portal is executive-only and seeds Wave 1 into CRM',async()=>{
  await withServer(async(base,store)=>{
    const anonymous=await fetch(`${base}/portal/deal-desk`,{redirect:'manual'});
    assert.equal(anonymous.status,302);

    const member=await fetch(`${base}/portal/deal-desk`,{headers:{authorization:'Bearer member'}});
    assert.equal(member.status,403);

    const admin=await fetch(`${base}/portal/deal-desk`,{headers:{authorization:'Bearer admin'}});
    assert.equal(admin.status,200);
    const html=await admin.text();
    assert.match(html,/NEO Deal Desk/);
    assert.match(html,/Episcopal Diocese of Texas/);
    assert.match(html,/Weil, Gotshal/);

    const leads=await store.list({type:'lead'});
    assert.ok(leads.some(item=>item.name==='Episcopal Diocese of Texas'));
    assert.ok(leads.some(item=>item.name==='Weil, Gotshal & Manges LLP'));
  });
});

test('Deal Desk snapshot remains draft-only for Wave 1',async()=>{
  await withServer(async base=>{
    const response=await fetch(`${base}/api/v1/deal-desk/snapshot`,{headers:{authorization:'Bearer admin'}});
    assert.equal(response.status,200);
    const data=await response.json();
    assert.equal(data.campaign,'NEO-DEALDESK-004');
    assert.equal(data.wave,1);
    assert.equal(data.liveSendEnabled,false);
    assert.equal(data.prospects.length,2);
  });
});
