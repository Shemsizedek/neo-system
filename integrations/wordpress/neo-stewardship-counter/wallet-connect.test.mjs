import test from 'node:test';
import assert from 'node:assert/strict';
import {connectStewardshipWallet,mountWalletConnections} from './wallet-connect.mjs';
const address='1Ky2wRYYrJzqdQJH64F7TR98fqLxJs7LK8';
const provider=(account={})=>({isNeoMask:true,connect:async()=>({address,network:'mainnet',ledger:'classic',...account}),signPsbt:async()=>{}});
test('NeoMask account and signing capability connect',async()=>{assert.equal((await connectStewardshipWallet(provider(),'', 'classic')).name,'NeoMask');});
test('unbranded direct providers and invalid account contexts are rejected',async()=>{
 await assert.rejects(connectStewardshipWallet({...provider(),isNeoMask:false},'','classic'),/NeoMask was not found/);
 await assert.rejects(connectStewardshipWallet(provider(),'',''),/Choose your wallet version/);
 await assert.rejects(connectStewardshipWallet(provider({ledger:'cp20'}),'','classic'),/does not match/);
 await assert.rejects(connectStewardshipWallet(provider({watchOnly:true}),'','classic'),/signing account/);
 await assert.rejects(connectStewardshipWallet(provider({network:'testnet'}),'','classic'),/mainnet/);
});
test('page never falls back to legacy direct signer',async()=>{
 let clicked,calls=0;const button={addEventListener:(name,f)=>clicked=f},status={},install={hidden:true};
 const root={querySelector:s=>({'[data-connect-status]':status,'[data-connect-member]':button,'[data-neomask-install]':install}[s]),closest:()=>({getAttribute:()=> 'classic'})};
 mountWalletConnections(root,{neoBitcoinSigner:{...provider(),connect:async()=>{calls++;return {address,network:'mainnet'}}}});
 await clicked();assert.equal(calls,0);assert.equal(install.hidden,false);assert.match(status.textContent,/No compatible wallet/);
});

test('treasury matching and no signing during connection',async()=>{let signed=0;const p={...provider(),signPsbt:()=>{signed++;throw Error('unexpected signing');}};assert.equal((await connectStewardshipWallet(p,address,'classic')).signingTested,false);assert.equal(signed,0);await assert.rejects(connectStewardshipWallet(p,'1BoatSLRHtKNngkdXEeobR76b53LETtpyT','classic'),/configured account/);await assert.rejects(connectStewardshipWallet({...p,signPsbt:undefined},'','classic'),/NeoMask was not found/);});
