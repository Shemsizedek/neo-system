import test from 'node:test';
import assert from 'node:assert/strict';
import {createNeoBankServer} from './server.mjs';

test('NEOB-005 activity and teller handoff require authentication',async()=>{
  const server=createNeoBankServer({store:{ping:async()=>true},sessionSecret:'test-secret'});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    const base='http://127.0.0.1:'+server.address().port;
    assert.equal((await fetch(base+'/api/v1/bank/activity')).status,401);
    assert.equal((await fetch(base+'/api/v1/bank/teller/support-handoffs',{method:'POST',body:'{}'})).status,401);
  }finally{await new Promise(resolve=>server.close(resolve))}
});
