import test from 'node:test';
import assert from 'node:assert/strict';
import {createGate12HealthHandler,activateGate12,STAGING_MODE} from './gate12-health-server.mjs';
import {SCRATCH_DB} from './gate11-config.mjs';
const connect='postgresql://'+SCRATCH_DB.role+':dummy-test-password@'+SCRATCH_DB.endpointHost+'/'+SCRATCH_DB.database+'?sslmode=require';
const req=(url,method='GET')=>({url,method});
function response(){const r={};return {writeHead(n,headers){r.status=n;r.headers=headers},end(body){r.body=JSON.parse(body)},get data(){return r}}}
test('health returns blocked until actual smoke has passed',()=>{
 const h=createGate12HealthHandler(()=>false),r=response();h(req('/healthz'),r);
 assert.equal(r.data.status,503);assert.equal(r.data.body.status,'blocked');
 assert.equal(r.data.headers['cache-control'],'no-store');
});
test('health ready has no buyer or payment metadata',()=>{
 const h=createGate12HealthHandler(()=>true),r=response();h(req('/healthz'),r);
 assert.equal(r.data.status,200);assert.equal(r.data.body.status,'ready');
 assert.equal(r.data.body.mode,STAGING_MODE);
 assert.equal(JSON.stringify(r.data.body).includes('token'),false);
});
test('public write and read endpoints are not mounted',()=>{
 const h=createGate12HealthHandler(()=>true);
 for(const [url,method] of [['/v1/flipper/buyers','GET'],['/v1/flipper/buyers','POST'],
  ['/v1/flipper/previews','POST'],['/v1/flipper/audit','GET'],['/','GET'],['/healthz','POST']]){
  const r=response();h(req(url,method),r);
  assert.equal(r.data.status,404);
 }
});
function fakeServer(handler){
 const calls=[];
 return {handler,calls,listen(port,host){calls.push([port,host])}};
}
test('missing scratch connection cannot activate ready',async()=>{
 const old=process.env.NEO_FLIPPER_GATE11_RUN;
 process.env.NEO_FLIPPER_GATE11_RUN='scratch-only';
 try{
  const service=await activateGate12({connectionString:'invalid',loadPool:async()=>{throw Error('not called')},
   runSmoke:async()=>{throw Error('not called')},httpServerFactory:fakeServer,port:10000});
  assert.equal(service.readiness(),false);assert.equal(service.diagnostics(),null);
  assert.deepEqual(service.publicRoutes,['GET /healthz']);
 }finally{if(old===undefined)delete process.env.NEO_FLIPPER_GATE11_RUN;else process.env.NEO_FLIPPER_GATE11_RUN=old}
});
test('matching synthetic evidence is required for ready health',async()=>{
 const old=process.env.NEO_FLIPPER_GATE11_RUN;
 process.env.NEO_FLIPPER_GATE11_RUN='scratch-only';
 try{
  const service=await activateGate12({connectionString:connect,loadPool:async()=>({}),
   runSmoke:async()=>({passed:true,mode:'scratch_only',recognizedRevenueUsd:1,checks:['pg_persistence']}),
   httpServerFactory:fakeServer,port:10000});
  assert.equal(service.readiness(),false);
 }finally{if(old===undefined)delete process.env.NEO_FLIPPER_GATE11_RUN;else process.env.NEO_FLIPPER_GATE11_RUN=old}
});
test('successful synthetic smoke permits readiness; only public health',async()=>{
 const old=process.env.NEO_FLIPPER_GATE11_RUN;
 process.env.NEO_FLIPPER_GATE11_RUN='scratch-only';
 try{
  const service=await activateGate12({connectionString:connect,loadPool:async()=>({}),
   runSmoke:async()=>({passed:true,mode:'scratch_only',recognizedRevenueUsd:0,checks:['pg_persistence','revocation']}),
   httpServerFactory:fakeServer,port:10000});
  assert.equal(service.readiness(),true);
  assert.equal(service.diagnostics().checks,2);
  assert.deepEqual(service.server.calls,[[10000,'0.0.0.0']]);
 }finally{if(old===undefined)delete process.env.NEO_FLIPPER_GATE11_RUN;else process.env.NEO_FLIPPER_GATE11_RUN=old}
});
