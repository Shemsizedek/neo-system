import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

process.env.NEO_DASH_ADMIN_TOKEN='test-admin-token';
const { createHandler } = await import('./server.mjs');
const { createMemoryStore } = await import('./store.mjs');

async function request(base,path,{method='GET',account,admin=false,body}={}){
  const headers={};if(account)headers['x-neo-pass-account']=account;if(admin)headers.authorization='Bearer test-admin-token';if(body!==undefined)headers['content-type']='application/json';
  const response=await fetch(`${base}${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});return {status:response.status,body:await response.json()};
}
async function withServer(run){delete process.env.NEO_DASH_DB_PATH;const store=createMemoryStore();const server=http.createServer(createHandler({store,checkout:async()=>({checkoutId:'checkout-guarded-1'})}));await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;try{return await run({base,store});}finally{await new Promise(r=>server.close(r));}}
async function approveDriver(base){const app=await request(base,'/providers/applications',{method:'POST',account:'driver-a',body:{requestedRoles:['DRIVER']}});return (await request(base,`/ops/providers/${app.body.id}/approve`,{method:'POST',admin:true,body:{roles:['DRIVER'],authorities:{driverLicense:true,vehicle:true,insurance:true}}})).body;}

async function ride(base){const quote=await request(base,'/quotes',{method:'POST',account:'rider-a',body:{serviceType:'RIDE',distanceKm:3,durationMinutes:8,pickup:{label:'A'},dropoff:{label:'B'}}});const job=await request(base,'/jobs',{method:'POST',account:'rider-a',body:{quoteId:quote.body.id,settlementAsset:'NOMNI'}});return job.body;}

test('provider vehicle records are owner-scoped',async()=>withServer(async({base})=>{const provider=await approveDriver(base);const denied=await request(base,`/providers/${provider.id}/vehicles`,{method:'POST',account:'other',body:{make:'NEO',model:'Dash'}});assert.equal(denied.status,403);const created=await request(base,`/providers/${provider.id}/vehicles`,{method:'POST',account:'driver-a',body:{make:'NEO',model:'Dash',year:2026,plate:'SAFE-1'}});assert.equal(created.status,201);assert.equal(created.body.status,'PENDING');const list=await request(base,`/providers/${provider.id}/vehicles`,{account:'driver-a'});assert.equal(list.body.vehicles.length,1);}));

test('merchant applications are visible only through account-scoped endpoint',async()=>withServer(async({base})=>{const created=await request(base,'/merchants/applications',{method:'POST',account:'merchant-a',body:{name:'Dash Kitchen'}});assert.equal(created.status,201);const mine=await request(base,'/merchants/me',{account:'merchant-a'});assert.equal(mine.body.merchants.length,1);const other=await request(base,'/merchants/me',{account:'merchant-b'});assert.equal(other.body.merchants.length,0);}));

test('matching creates dispatch offer and checkout creates bookkeeping payment',async()=>withServer(async({base})=>{await approveDriver(base);const job=await ride(base);const matched=await request(base,`/jobs/${job.id}/match`,{method:'POST',admin:true});assert.equal(matched.status,200);const offers=await request(base,`/jobs/${job.id}/dispatch-offers`,{account:'rider-a'});assert.equal(offers.body.offers.length,1);await request(base,`/jobs/${job.id}/accept`,{method:'POST',account:'driver-a'});const checked=await request(base,`/jobs/${job.id}/checkout`,{method:'POST',account:'rider-a'});assert.equal(checked.status,200);const payments=await request(base,`/jobs/${job.id}/payments`,{account:'rider-a'});assert.equal(payments.body.payments.length,1);assert.equal(payments.body.payments[0].state,'CHECKOUT_CREATED');}));

test('audit endpoint is admin only',async()=>withServer(async({base})=>{const provider=await approveDriver(base);const denied=await request(base,`/ops/audit/provider/${provider.id}`,{account:'driver-a'});assert.equal(denied.status,403);const allowed=await request(base,`/ops/audit/provider/${provider.id}`,{admin:true});assert.equal(allowed.status,200);assert.ok(allowed.body.events.some(event=>event.eventType==='PROVIDER_APPROVED'));}));
