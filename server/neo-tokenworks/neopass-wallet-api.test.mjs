import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import bitcoinMessage from 'bitcoinjs-message';
import { createNeopassWalletServer } from './neopass-wallet-api.mjs';
import { createSqliteWalletProofStore } from './neopass-wallet-store.mjs';

const origin='https://pass.example.org',root='/api/v1/neopass/wallets';
const key=Buffer.alloc(32);key[31]=1; // Public disposable fixture key; never fund.
const address='1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH';
async function fixture(t) {
 const dir=mkdtempSync(join(tmpdir(),'neopass-api-'));
 const store=createSqliteWalletProofStore({path:join(dir,'links.sqlite')});
 let revoked=false;
 const server=createNeopassWalletServer({origin,store,verifySession:async token=>revoked?null:token==='member'?{subject:'member',sessionId:'s1'}:token==='other'?{subject:'other',sessionId:'s2'}:null});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(async()=>{await new Promise(resolve=>server.close(resolve));store.close();rmSync(dir,{recursive:true,force:true});});
 async function call(path='',body,token='member',headers={}) {
  const response=await fetch(`http://127.0.0.1:${server.address().port}${root}${path}`,{method:body===undefined?'GET':'POST',headers:{origin,authorization:`Bearer ${token}`,'content-type':'application/json',...headers},body:body===undefined?undefined:JSON.stringify(body)});
  return {status:response.status,body:await response.json()};
 }
 const challenge=()=>call('/challenges',{address,network:'bitcoin-mainnet'});
 const signed=c=>({id:c.id,signature:bitcoinMessage.sign(c.message,key,true).toString('base64')});
 return {call,challenge,signed,store,revokeSession:()=>{revoked=true;}};
}
test('real signature links wallet, persists owner record, prevents replay and scopes revocation',async t=>{
 const x=await fixture(t),c=(await x.challenge()).body;
 assert.equal((await x.call('/verify',x.signed(c))).status,200);
 assert.equal((await x.call()).body.wallets[0].address,address);
 assert.equal(x.store.listLinked('member').length,1);
 assert.equal((await x.call('/verify',x.signed(c))).status,403);
 assert.deepEqual((await x.call('',undefined,'other')).body.wallets,[]);
 assert.equal((await x.call('',{address,network:'bitcoin-mainnet'},'other')).body.revoked,false);
 assert.equal((await x.call('',{address,network:'bitcoin-mainnet'})).body.revoked,true);
 assert.deepEqual((await x.call()).body.wallets,[]);
});
test('rejects missing authentication, foreign origin and caller-supplied identity',async t=>{
 const x=await fixture(t);
 assert.equal((await x.call('',undefined,'invalid')).status,401);
 assert.equal((await x.call('',undefined,'member',{origin:'https://evil.example'})).status,403);
 assert.equal((await x.call('/challenges',{subject:'other',address,network:'bitcoin-mainnet'})).status,400);
});
test('different member cannot consume challenge or take an existing wallet link',async t=>{
 const x=await fixture(t),c=(await x.challenge()).body;
 assert.equal((await x.call('/verify',x.signed(c),'other')).status,403);
 assert.equal((await x.call('/verify',x.signed(c))).status,200);
 const other=(await x.call('/challenges',{address,network:'bitcoin-mainnet'},'other')).body;
 assert.equal((await x.call('/verify',x.signed(other),'other')).status,409);
});
test('invalid signature and revoked session cannot link a wallet',async t=>{
 const x=await fixture(t),c=(await x.challenge()).body;
 assert.equal((await x.call('/verify',{id:c.id,signature:'invalid'})).status,403);
 const next=(await x.challenge()).body;x.revokeSession();
 assert.equal((await x.call('/verify',x.signed(next))).status,401);
 assert.deepEqual(x.store.listLinked('member'),[]);
});
test('requires trusted session verifier and durable store',()=>{
 assert.throws(()=>createNeopassWalletServer({origin}));
});
