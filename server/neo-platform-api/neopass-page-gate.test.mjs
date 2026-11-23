import test from 'node:test';
import assert from 'node:assert/strict';
import {createNeopassPageGate} from './neopass-page-gate.mjs';
const identity={method:'neopass',subject:'owner',audience:'counterpay',verified:true,authenticatedAt:1000};
const passkey={...identity,method:'passkey',authenticatedAt:1100,userVerified:true};
const wallet={...identity,method:'neomask',authenticatedAt:1200,localUnlock:true,walletProofVerified:true,address:'verified-address'};
const gate=(resolveProofs,member=true)=>createNeopassPageGate({resolveSession:async()=>({subject:'owner'}),resolveProofs,authorize:async()=>member,now:()=>2000});
const policy={service:'counterpay',walletProtected:true};
const check=(proofs,member=true)=>gate(async()=>proofs,member)({},policy);
test('ordered NEO Pass, passkey and NeoMask entry',async()=>{
 assert.equal((await check([])).next,'neopass');assert.equal((await check([identity])).next,'passkey');assert.equal((await check([identity,passkey])).next,'neomask');
 const result=await check([identity,passkey,wallet]);assert.equal(result.allowed,true);assert.equal(result.walletKeyAccess,false);
});
test('invalid, stale and cross-account or cross-service proofs fail closed',async()=>{
 for(const delta of [{subject:'other'},{audience:'gisd'},{authenticatedAt:-400000},{authenticatedAt:3000},{authenticatedAt:1050},{verified:false},{localUnlock:false},{walletProofVerified:false},{address:''}])assert.equal((await check([identity,passkey,{...wallet,...delta}])).allowed,false);
 assert.equal((await check([identity,{...passkey,userVerified:false},wallet])).allowed,false);assert.equal((await check([identity,passkey,wallet],false)).allowed,false);
});
test('revocation is rechecked on each protected request',async()=>{
 let proofs=[identity,passkey,wallet];const evaluate=gate(async()=>proofs);
 assert.equal((await evaluate({},policy)).allowed,true);proofs=[];assert.equal((await evaluate({},policy)).allowed,false);
});
test('member pages support passkey entry without wallet requirement',async()=>{
 assert.equal((await gate(async()=>[identity,passkey])({},{service:'counterpay'})).allowed,true);
});
