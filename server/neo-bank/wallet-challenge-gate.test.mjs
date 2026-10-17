import test from 'node:test';
import assert from 'node:assert/strict';
import {createNeoBankServer} from './server.mjs';
import {newWalletChallenge} from './routing-bridge.mjs';

test('wallet proof challenge is non-transactional and expires',()=>{
 const c=newWalletChallenge({accountId:'NMNI0002',network:'bitcoin-mainnet',address:'bc1qexampleaddress',now:0});
 assert.equal(c.status,'UNVERIFIED');
 assert.equal(c.broadcast,false);
 assert.equal(c.expiresAt,'1970-01-01T00:05:00.000Z');
});
test('challenge issue route disallows anonymous callers',async()=>{
 const server=createNeoBankServer({store:{ping:async()=>true},sessionSecret:'test-secret'});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const url='http://127.0.0.1:'+server.address().port+'/api/v1/bank/wallet/challenges';
  assert.equal((await fetch(url,{method:'POST',body:'{}'})).status,401);
 }finally{await new Promise(resolve=>server.close(resolve))}
});
