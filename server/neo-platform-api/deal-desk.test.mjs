import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createNeoPlatformApi } from './server.mjs';
import { createInMemoryCrmStore } from './crm-store.mjs';
import { createInMemoryOutreachStore } from '../neo-deal-desk/outreach-store.mjs';

async function withServer(fn,{crmStore=createInMemoryCrmStore(),outreachStore=createInMemoryOutreachStore()}={}){
  const subjectResolver=req=>req.headers.authorization?.replace('Bearer ','')||null;
  const authService={session:async subject=>({subject,displayName:subject,role:subject==='admin'?'executive-admin':'member',neopassStatus:'active'})};
  const server=createNeoPlatformApi({now:()=> '2026-10-16T16:00:00.000Z',subjectResolver,authService,crmStore,outreachStore});
  server.listen(0,'127.0.0.1');
  await once(server,'listening');
  const {port}=server.address();
  try{await fn(`http://127.0.0.1:${port}`,crmStore,outreachStore)}finally{server.close();await once(server,'close')}
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
    assert.equal(data.outboundExecution.providerBoundary,'NEO_MAIL');
    assert.equal(data.outboundExecution.liveNetworkSend,false);
  });
});


test('Deal Desk outreach API requires approval before provider handoff',async()=>{
  await withServer(async(base,_crm,outreach)=>{
    const listed=await fetch(`${base}/api/v1/deal-desk/outreach`,{headers:{authorization:'Bearer admin'}});
    assert.equal(listed.status,200);
    const payload=await listed.json();
    assert.equal(payload.records.length,2);
    const item=payload.records[0];

    const member=await fetch(`${base}/api/v1/deal-desk/outreach`,{headers:{authorization:'Bearer member'}});
    assert.equal(member.status,403);

    const dispatchBefore=await fetch(`${base}/api/v1/deal-desk/outreach/${encodeURIComponent(item.id)}/dispatch`,{
      method:'POST',headers:{authorization:'Bearer admin','content-type':'application/json'},body:'{}'
    });
    assert.equal(dispatchBefore.status,502);

    const approve=await fetch(`${base}/api/v1/deal-desk/outreach/${encodeURIComponent(item.id)}/approve`,{
      method:'POST',headers:{authorization:'Bearer admin','content-type':'application/json'},body:'{}'
    });
    assert.equal(approve.status,200);

    const dispatch=await fetch(`${base}/api/v1/deal-desk/outreach/${encodeURIComponent(item.id)}/dispatch`,{
      method:'POST',headers:{authorization:'Bearer admin','content-type':'application/json'},body:JSON.stringify({providerRef:'neo-mail:test-1'})
    });
    assert.equal(dispatch.status,200);
    const dispatched=await dispatch.json();
    assert.equal(dispatched.record.status,'awaiting_provider');

    const saved=await outreach.get(item.id);
    assert.equal(saved.status,'awaiting_provider');
  });
});

test('Deal Desk records provider delivery and positive reply',async()=>{
  await withServer(async(base)=>{
    const listed=await fetch(`${base}/api/v1/deal-desk/outreach`,{headers:{authorization:'Bearer admin'}});
    const {records}=await listed.json();
    const item=records[0];

    await fetch(`${base}/api/v1/deal-desk/outreach/${encodeURIComponent(item.id)}/approve`,{
      method:'POST',headers:{authorization:'Bearer admin','content-type':'application/json'},body:'{}'
    });
    await fetch(`${base}/api/v1/deal-desk/outreach/${encodeURIComponent(item.id)}/dispatch`,{
      method:'POST',headers:{authorization:'Bearer admin','content-type':'application/json'},body:JSON.stringify({providerRef:'neo-mail:test-2'})
    });
    const receipt=await fetch(`${base}/api/v1/deal-desk/outreach/${encodeURIComponent(item.id)}/receipt`,{
      method:'POST',headers:{authorization:'Bearer admin','content-type':'application/json'},body:JSON.stringify({outcome:'delivered',receipt:{messageId:'test-2'}})
    });
    assert.equal(receipt.status,200);

    const reply=await fetch(`${base}/api/v1/deal-desk/outreach/${encodeURIComponent(item.id)}/reply`,{
      method:'POST',headers:{authorization:'Bearer admin','content-type':'application/json'},body:JSON.stringify({text:'Interested. Let us schedule a meeting.'})
    });
    assert.equal(reply.status,200);
    const body=await reply.json();
    assert.equal(body.record.replyClassification,'positive_interest');
    assert.equal(body.record.nextAction,'create_qualified_conversation');
  });
});
