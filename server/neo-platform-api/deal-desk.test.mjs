import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createNeoPlatformApi } from './server.mjs';
import { createInMemoryCrmStore } from './crm-store.mjs';

async function withServer(fn,{crmStore=createInMemoryCrmStore(),dealDeskMailAdapter=null,dealDeskOutboundEnabled=false}={}){
  const subjectResolver=req=>req.headers.authorization?.replace('Bearer ','')||null;
  const authService={session:async subject=>({subject,displayName:subject,role:subject==='admin'?'executive-admin':'member',neopassStatus:'active'})};
  const server=createNeoPlatformApi({now:()=> '2026-10-16T16:00:00.000Z',subjectResolver,authService,crmStore,dealDeskMailAdapter,dealDeskOutboundEnabled});
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


test('Deal Desk outbox is executive-only and seeded from Wave 1',async()=>{
  await withServer(async base=>{
    const denied=await fetch(`${base}/api/v1/deal-desk/outbox`,{headers:{authorization:'Bearer member'}});
    assert.equal(denied.status,403);
    const response=await fetch(`${base}/api/v1/deal-desk/outbox`,{headers:{authorization:'Bearer admin'}});
    assert.equal(response.status,200);
    const data=await response.json();
    assert.equal(data.status.executionEnabled,false);
    assert.equal(data.items.length,2);
    assert.ok(data.items.every(item=>['draft_ready','approval_required'].includes(item.status)));
  });
});

test('Deal Desk approval works but dispatch remains blocked while execution is disabled',async()=>{
  await withServer(async base=>{
    let response=await fetch(`${base}/api/v1/deal-desk/outbox/wave1%3A1/approve`,{
      method:'POST',
      headers:{authorization:'Bearer admin','content-type':'application/json'},
      body:JSON.stringify({note:'Approved commercial introduction'})
    });
    assert.equal(response.status,200);
    let data=await response.json();
    assert.equal(data.item.status,'approved_to_send');

    response=await fetch(`${base}/api/v1/deal-desk/outbox/wave1%3A1/dispatch`,{
      method:'POST',
      headers:{authorization:'Bearer admin','content-type':'application/json'},
      body:'{}'
    });
    assert.equal(response.status,503);
    data=await response.json();
    assert.equal(data.error,'outbound_execution_disabled');
  });
});

test('Deal Desk dispatch logs CRM activity when explicitly enabled with an adapter',async()=>{
  const delivered=[];
  const crmStore=createInMemoryCrmStore();
  await withServer(async base=>{
    let response=await fetch(`${base}/api/v1/deal-desk/outbox/wave1%3A1/approve`,{
      method:'POST',
      headers:{authorization:'Bearer admin','content-type':'application/json'},
      body:'{}'
    });
    assert.equal(response.status,200);

    response=await fetch(`${base}/api/v1/deal-desk/outbox/wave1%3A1/dispatch`,{
      method:'POST',
      headers:{authorization:'Bearer admin','content-type':'application/json'},
      body:'{}'
    });
    assert.equal(response.status,200);
    const data=await response.json();
    assert.equal(data.item.status,'sent');
  },{
    crmStore,
    dealDeskOutboundEnabled:true,
    dealDeskMailAdapter:{send:async message=>{delivered.push(message);return {provider:'test-mail',messageId:'msg-1'}}}
  });
  assert.equal(delivered.length,1);
  const activity=await crmStore.list({type:'activity'});
  assert.equal(activity.length,1);
  assert.match(activity[0].name,/Outbound sent/);
});
