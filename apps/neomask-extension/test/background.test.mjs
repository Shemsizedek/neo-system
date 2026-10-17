import assert from 'node:assert/strict';
import {bitcoin,ECPair} from '../src/wallet.mjs';
import {Buffer} from 'buffer';
let listener,opened;const values={};
globalThis.chrome={
 storage:{local:{setAccessLevel:()=>{},get:async key=>key===null?{...values}:typeof key==='string'?{[key]:values[key]}:{},set:async object=>Object.assign(values,object),remove:async keys=>{for(const k of Array.isArray(keys)?keys:[keys])delete values[k];}}},
 windows:{onRemoved:{addListener:()=>{}},create:async options=>{opened=options.url;return{id:1};},remove:async()=>{}},
 runtime:{id:'fixture-extension',getURL:path=>'chrome-extension://fixture-extension/'+path,onMessage:{addListener:fn=>listener=fn}}
};
await import('../src/background.mjs');
const ui={id:'fixture-extension',url:'chrome-extension://fixture-extension/vault.html'};
const page={id:'fixture-extension',tab:{id:1},frameId:0,url:'https://holytemples.org/holy-stewardship/'};
const popup={id:'fixture-extension',url:'chrome-extension://fixture-extension/popup.html'};
const send=(message,sender=ui)=>new Promise(resolve=>listener(message,sender,resolve));
const key=ECPair.fromPrivateKey(Buffer.alloc(32,5)),receiver=ECPair.fromPrivateKey(Buffer.alloc(32,6));
const source=bitcoin.payments.p2pkh({pubkey:key.publicKey}).address;
const destination=bitcoin.payments.p2pkh({pubkey:receiver.publicKey}).address;
const password='background integration fixture password';
assert((await send({kind:'saveVault',wif:key.toWIF(),password},page)).error);
assert.equal((await send({kind:'saveVault',wif:key.toWIF(),password})).result.address,source);
assert(!JSON.stringify(values).includes(key.toWIF()));
const connection=send({kind:'page',method:'connect',params:{ledger:'classic'}},page);
while(!opened)await new Promise(resolve=>setImmediate(resolve));
let id=new URL(opened).searchParams.get('request');opened=undefined;
assert((await send({kind:'pending',id},page)).error);
assert.equal((await send({kind:'decide',id,approve:true},popup)).result.approved,true);
assert.equal((await connection).result.address,source);
const prev=new bitcoin.Transaction();prev.addInput(Buffer.alloc(32),0xffffffff);prev.addOutput(bitcoin.address.toOutputScript(source),100000n);
const psbt=new bitcoin.Psbt();psbt.addInput({hash:prev.getId(),index:0,nonWitnessUtxo:prev.toBuffer()});psbt.addOutput({address:destination,value:50000n});psbt.addOutput({address:source,value:49000n});
const signing=send({kind:'page',method:'signPsbt',params:{ledger:'classic',hex:psbt.toHex()}},page);
while(!opened)await new Promise(resolve=>setImmediate(resolve));
id=new URL(opened).searchParams.get('request');
assert.equal((await send({kind:'pending',id},popup)).result.summary.feeSats,'1000');
assert((await send({kind:'decide',id,approve:true,password:'wrong fixture password'},popup)).error);
assert.equal((await send({kind:'decide',id,approve:true,password},popup)).result.approved,true);
const signed=(await signing).result;assert(bitcoin.Transaction.fromHex(signed.rawTx).ins[0].script.length>0);
await send({kind:'revoke'},popup);
assert((await send({kind:'page',method:'getAccount',params:{ledger:'classic'}},page)).error);
console.log('PASS: actual background request flow: encrypted import, trusted popup, account approval, PSBT review, wrong-password rejection, signing and revocation');

