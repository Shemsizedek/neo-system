import test from 'node:test';
import assert from 'node:assert/strict';
import {createNeoBankServer} from './server.mjs';
test('NEOB-015 wallet and attestation lookups reject anonymous access',async()=>{
 const server=createNeoBankServer({store:{},sessionSecret:'test-secret'});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const base='http://127.0.0.1:'+server.address().port;
  for(const path of ['/api/v1/bank/wallets','/api/v1/crown/attestations','/api/v1/bank/teller/integration-status'])assert.equal((await fetch(base+path)).status,401);
 }finally{await new Promise(resolve=>server.close(resolve))}
});
