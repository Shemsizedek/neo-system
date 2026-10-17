import test from 'node:test';
import assert from 'node:assert/strict';
import {createNeoBankServer} from './server.mjs';
import {issueTellerAssertion,verifyTellerAssertion} from './teller-assertion.mjs';

test('signed Teller claims bind to issuer audience subject and expiry',()=>{
 const secret='a-long-private-test-secret-with-more-than-32-characters';
 const token=issueTellerAssertion({subject:'google:member01',sessionId:'session-1234'},{secret,now:()=>1000});
 const claims=verifyTellerAssertion(token,{secret,now:()=>2000});
 assert.equal(claims.subject,'google:member01');
 assert.equal(claims.verified,true);
 assert.equal(claims.canBroadcast,false);
 assert.throws(()=>verifyTellerAssertion(token,{secret,now:()=>123001}),/teller_session_invalid/);
});
test('private Crown anchoring queue requires an authenticated member',async()=>{
 const server=createNeoBankServer({store:{},sessionSecret:'test-secret'});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/v1/crown/anchoring-requests',{method:'POST',body:'{}'});
  assert.equal(response.status,401);
 }finally{await new Promise(resolve=>server.close(resolve))}
});
