import test from 'node:test';
import assert from 'node:assert/strict';
import {createAgent} from './agent.mjs';
test('companion rejects unknown origins and missing tokens',async()=>{
 const agent=createAgent({secret:'x'.repeat(64),run:async()=>({output:'ok',code:0})});
 await new Promise(r=>agent.listen(0,'127.0.0.1',r));
 try{
  const url='http://127.0.0.1:'+agent.address().port+'/command';
  const blocked=await fetch(url,{method:'POST',headers:{origin:'https://attacker.example','x-neo-token':'x'.repeat(64)},body:'{"command":"pwd"}'});
  assert.equal(blocked.status,403);
  const unauthorized=await fetch(url,{method:'POST',headers:{origin:'https://connect.holytemples.org'},body:'{"command":"pwd"}'});
  assert.equal(unauthorized.status,401);
  const allowed=await fetch(url,{method:'POST',headers:{origin:'https://connect.holytemples.org','x-neo-token':'x'.repeat(64)},body:'{"command":"pwd"}'});
  assert.equal(allowed.status,200);
 }finally{await new Promise(r=>agent.close(r))}
});
