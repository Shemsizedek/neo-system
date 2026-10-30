import assert from 'node:assert/strict';
import test from 'node:test';
import {once} from 'node:events';
import {createNeoBankStagingServer} from './staging.mjs';

test('preview reports readiness distinctly from banking readiness and blocks financial actions',async()=>{
 const server=createNeoBankStagingServer();
 server.listen(0,'127.0.0.1');await once(server,'listening');
 try{
  const base='http://127.0.0.1:'+server.address().port;
  const health=await fetch(base+'/healthz');
  assert.equal(health.status,200);
  assert.equal((await health.json()).bankOperational,false);
  assert.equal((await fetch(base+'/health')).status,503);
  assert.equal((await fetch(base+'/api/v1/community/status')).status,503);
  assert.equal((await fetch(base+'/api/v1/transfers',{method:'POST',body:'{}'})).status,503);
  assert.equal((await fetch(base+'/api/v1/offers',{method:'POST',body:'{}'})).status,503);
  const auth=await fetch(base+'/api/v1/auth/config');
  assert.equal((await auth.json()).enabled,false);
  const registry=await fetch(base+'/api/v1/ces/exchanges').then(r=>r.json());
  assert.equal(registry.verifiedExternalConnections,0);
  assert.equal(registry.bot.liveExecution,false);
  assert.ok(registry.exchanges.some(x=>x.exchangeId==='NMNI'));
  const page=await fetch(base).then(r=>r.text());
  assert.match(page,/Read-only staging preview/);
 }finally{server.close();await once(server,'close')}
});
test('CES bridge only accepts trusted health evidence and never treats it as account authentication',async()=>{
 let called=0;
 const fake=async(url,options)=>{called++;assert.equal(url,'https://neo-ces-read-staging.onrender.com/health');assert.equal(options.method,'GET');assert.equal(options.headers.accept,'application/json');assert.equal(options.headers.authorization,undefined);return new Response(JSON.stringify({ok:true,service:'neo-ces-read-runtime',database:true}),{status:200})};
 const server=createNeoBankStagingServer({cesReadFetch:fake});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 try{const base='http://127.0.0.1:'+server.address().port;
  const response=await fetch(base+'/api/v1/ces/bridge/status');
  const result=await response.json();
  assert.equal(result.ces.transport,'reachable');
  assert.equal(result.ces.sourceDatabase,'connected');
  assert.equal(result.ces.cesAccountsAuthenticated,false);
  assert.equal(result.verifiedExternalAccountLinks,0);
  assert.equal(called,1);
 }finally{server.close();await once(server,'close')}
});

test('CES bridge fails closed when health is unavailable or untrusted',async()=>{
 const server=createNeoBankStagingServer({cesReadFetch:async()=>new Response(JSON.stringify({ok:true,service:'wrong-service',database:true}),{status:200})});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 try{
  const report=await fetch('http://127.0.0.1:'+server.address().port+'/api/v1/ces/bridge/status').then(r=>r.json());
  assert.equal(report.ces.transport,'unavailable');
  assert.equal(report.ces.sourceDatabase,'unverified');
  assert.equal(report.ces.financialWritesEnabled,false);
 }finally{server.close();await once(server,'close')}
});
