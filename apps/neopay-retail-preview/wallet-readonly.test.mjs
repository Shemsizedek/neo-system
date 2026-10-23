import test from 'node:test';import assert from 'node:assert/strict';import {parseWalletAddress,normalizeWalletSnapshot,createReadOnlyWalletController} from './wallet-readonly.mjs';
const address='1BoatSLRHtKNngkdXEeobR76b53LETtpyT';
test('rejects invalid addresses',()=>assert.throws(()=>parseWalletAddress('javascript:alert(1)'),/unsupported/));
test('rejects treasury-only or unverified balance payloads',()=>assert.throws(()=>normalizeWalletSnapshot({wallet:address,network:['bitcoin','counterparty']},{address}),/unverified/));
test('requires explicit verified provenance and string quantities',()=>{
const snapshot={verified:true,network:'bitcoin-mainnet',address,asOf:'2026-10-23T00:00:00Z',assets:[{asset:'BTC',quantity:'0.01000000'}],transactions:[{txid:'example',status:'confirmed'}]};
assert.equal(normalizeWalletSnapshot(snapshot,{address}).assets[0].quantity,'0.01000000');
assert.throws(()=>normalizeWalletSnapshot({...snapshot,assets:[{asset:'BTC',quantity:0.01}]},{address}),/invalid_asset/);
});
test('controller forwards only validated address',async()=>{
const ctl=createReadOnlyWalletController({fetchSnapshot:async a=>({verified:true,network:'bitcoin-mainnet',address:a,assets:[],transactions:[]})});
assert.equal((await ctl.connect(address)).address,address);
});
