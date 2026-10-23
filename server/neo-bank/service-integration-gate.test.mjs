import test from 'node:test';
import assert from 'node:assert/strict';
import {createNeoBankServer} from './server.mjs';
test('Teller assertion consumption rejects unauthenticated service requests',async()=>{
 const server=createNeoBankServer({store:{},sessionSecret:'test-only-secret'});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const base='http://127.0.0.1:'+server.address().port;
  const r=await fetch(base+'/api/v1/bank/teller/assertions/consume',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({assertion:'unsigned'})});
  assert.notEqual(r.status,200);
  assert.equal((await fetch(base+'/api/v1/admin/crown/audit')).status,401);
 }finally{await new Promise(resolve=>server.close(resolve))}
});
