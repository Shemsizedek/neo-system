import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

process.env.NEO_DASH_ADMIN_TOKEN='test-admin-token';
const { createHandler } = await import('./server.mjs');
const { createMemoryStore } = await import('./store.mjs');

async function withServer(run,{checkout=async()=>({checkoutId:'checkout-test-1'})}={}){
  const store=createMemoryStore();
  const server=http.createServer(createHandler({store,checkout}));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const address=server.address();
  const base=`http://127.0.0.1:${address.port}`;
  try{return await run({base,store});}finally{await new Promise(resolve=>server.close(resolve));}
}

async function request(base,path,{method='GET',account,admin=false,body}={}){
  const headers={};
  if(account) headers['x-neo-pass-account']=account;
  if(admin) headers.authorization='Bearer test-admin-token';
  if(body!==undefined) headers['content-type']='application/json';
  const response=await fetch(`${base}${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  const json=await response.json();
  return {status:response.status,body:json};
}

async function approvedDriver(base){
  const application=await request(base,'/providers/applications',{method:'POST',account:'driver-neopass',body:{requestedRoles:['DRIVER']}});
  assert.equal(application.status,201);
  const approval=await request(base,`/ops/providers/${application.body.id}/approve`,{method:'POST',admin:true,body:{roles:['DRIVER'],authorities:{driverLicense:true,vehicle:true,insurance:true}}});
  assert.equal(approval.status,200);
  return approval.body;
}

test('customer cannot self-approve provider authority',async()=>withServer(async({base})=>{
  const application=await request(base,'/providers/applications',{method:'POST',account:'rider',body:{requestedRoles:['DRIVER']}});
  const approval=await request(base,`/ops/providers/${application.body.id}/approve`,{method:'POST',account:'rider',body:{roles:['DRIVER'],authorities:{driverLicense:true,vehicle:true,insurance:true}}});
  assert.equal(approval.status,403);
  assert.equal(approval.body.error,'admin_forbidden');
}));

test('quote total is server derived and caller amount is ignored',async()=>withServer(async({base})=>{
  const quote=await request(base,'/quotes',{method:'POST',account:'rider',body:{serviceType:'RIDE',distanceKm:10,durationMinutes:20,commercialAmountWorld:0.01,pickup:{label:'A'},dropoff:{label:'B'}}});
  assert.equal(quote.status,201);
  assert.equal(quote.body.commercialAmountWorld,24.1);
  assert.ok(quote.body.components.some(item=>item.code==='DISTANCE'));
}));

test('unsupported settlement asset is rejected before checkout',async()=>withServer(async({base})=>{
  const quote=await request(base,'/quotes',{method:'POST',account:'rider',body:{serviceType:'PACKAGE',distanceKm:2,durationMinutes:5,pickup:{label:'A'},dropoff:{label:'B'}}});
  const job=await request(base,'/jobs',{method:'POST',account:'rider',body:{quoteId:quote.body.id,settlementAsset:'ETH'}});
  assert.equal(job.status,400);
  assert.equal(job.body.error,'unsupported_settlement_asset');
}));

test('ride lifecycle matches an approved driver and checkout uses server amount',async()=>{
  let checkoutPayload;
  await withServer(async({base})=>{
    const driver=await approvedDriver(base);
    const quote=await request(base,'/quotes',{method:'POST',account:'rider',body:{serviceType:'RIDE',distanceKm:5,durationMinutes:10,pickup:{label:'Origin'},dropoff:{label:'Destination'}}});
    const job=await request(base,'/jobs',{method:'POST',account:'rider',body:{quoteId:quote.body.id,settlementAsset:'NOMNI'}});
    assert.equal(job.status,201);
    assert.equal(job.body.state,'MATCHING');

    const matched=await request(base,`/jobs/${job.body.id}/match`,{method:'POST',admin:true});
    assert.equal(matched.status,200);
    assert.equal(matched.body.providerId,driver.id);
    assert.equal(matched.body.state,'OFFERED');

    const accepted=await request(base,`/jobs/${job.body.id}/accept`,{method:'POST',account:'driver-neopass'});
    assert.equal(accepted.status,200);
    assert.equal(accepted.body.state,'ACCEPTED');

    const checkout=await request(base,`/jobs/${job.body.id}/checkout`,{method:'POST',account:'rider'});
    assert.equal(checkout.status,200);
    assert.equal(checkout.body.state,'PAYMENT_PENDING');
    assert.equal(checkout.body.checkoutId,'checkout-live-safe-test');
    assert.equal(checkoutPayload.settlementAsset,'NOMNI');
    assert.equal(checkoutPayload.commercialAmountWorld,quote.body.commercialAmountWorld);

    const illegal=await request(base,`/jobs/${job.body.id}/state`,{method:'POST',admin:true,body:{state:'COMPLETED'}});
    assert.equal(illegal.status,400);
    assert.match(illegal.body.error,/invalid_transition/);
  },{checkout:async payload=>{checkoutPayload=payload;return {checkoutId:'checkout-live-safe-test'};}});
});

test('ride matching fails closed when driver operational gates are incomplete',async()=>withServer(async({base})=>{
  const application=await request(base,'/providers/applications',{method:'POST',account:'driver-neopass',body:{requestedRoles:['DRIVER']}});
  await request(base,`/ops/providers/${application.body.id}/approve`,{method:'POST',admin:true,body:{roles:['DRIVER'],authorities:{driverLicense:true,vehicle:true,insurance:false}}});
  const quote=await request(base,'/quotes',{method:'POST',account:'rider',body:{serviceType:'RIDE',distanceKm:1,durationMinutes:4,pickup:{label:'A'},dropoff:{label:'B'}}});
  const job=await request(base,'/jobs',{method:'POST',account:'rider',body:{quoteId:quote.body.id,settlementAsset:'BTC'}});
  const match=await request(base,`/jobs/${job.body.id}/match`,{method:'POST',admin:true});
  assert.equal(match.status,409);
  assert.equal(match.body.error,'no_provider');
  assert.equal(match.body.job.state,'NO_PROVIDER');
}));
