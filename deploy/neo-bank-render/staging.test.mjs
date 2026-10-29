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