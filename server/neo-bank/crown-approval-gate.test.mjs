import test from 'node:test';
import assert from 'node:assert/strict';
import {createNeoBankServer} from './server.mjs';
test('Crown decision endpoint rejects anonymous requests',async()=>{
 const server=createNeoBankServer({store:{},sessionSecret:'test-secret'});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const url='http://127.0.0.1:'+server.address().port+'/api/v1/admin/crown/anchoring-requests/'+'a'.repeat(64)+'/decision';
  const result=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({decision:'APPROVED'})});
  assert.equal(result.status,401);
 }finally{await new Promise(resolve=>server.close(resolve))}
});
