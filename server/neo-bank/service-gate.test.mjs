import test from 'node:test';
import assert from 'node:assert/strict';
import {createNeoBankServer} from './server.mjs';

test('NEOB-004 support and evidence endpoints reject anonymous requests',async()=>{
 const store={ping:async()=>true};
 const server=createNeoBankServer({store,sessionSecret:'test-secret'});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try {
   const base='http://127.0.0.1:'+server.address().port;
   for(const path of ['/api/v1/bank/support/cases','/api/v1/crown/evidence/records']){
     const result=await fetch(base+path,{method:'POST',body:'{}'});
     assert.equal(result.status,401);
   }
   assert.equal((await fetch(base+'/api/v1/bank/support/cases')).status,401);
 } finally {await new Promise(resolve=>server.close(resolve))}
});
