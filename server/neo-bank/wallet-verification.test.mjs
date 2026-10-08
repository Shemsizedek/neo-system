import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyWalletProof,cesReadAdapterConfig} from './wallet-verification.mjs';
const challenge={challengeId:'a'.repeat(64),nmniAccountId:'NMNI0002',network:'bitcoin-mainnet',address:'bc1qtestaddresshere',message:'NEO BANK OWNERSHIP',expiresAt:'2030-01-01T00:05:00.000Z',status:'UNVERIFIED',consumed:false};
const input={challengeId:challenge.challengeId,address:challenge.address,network:challenge.network,signature:'YWJjZA==',scheme:'BIP322'};
test('requires a configured real signature verifier',async()=>{
 await assert.rejects(verifyWalletProof(challenge,input,{clock:()=>0}),/wallet_verifier_not_configured/);
 await assert.rejects(verifyWalletProof(challenge,input,{clock:()=>0,verifySignature:async()=>false}),/wallet_signature_invalid/);
});
test('rejects expired, consumed and mismatched challenges',async()=>{
 const opts={clock:()=>Date.parse('2031-01-01'),verifySignature:async()=>true};
 await assert.rejects(verifyWalletProof(challenge,input,opts),/wallet_challenge_expired/);
 await assert.rejects(verifyWalletProof({...challenge,consumed:true},input,opts),/wallet_challenge_unavailable/);
 await assert.rejects(verifyWalletProof(challenge,{...input,address:'different'},{clock:()=>0,verifySignature:async()=>true}),/wallet_challenge_mismatch/);
});
test('even valid verifier output only grants a non-transaction proof',async()=>{
 const proof=await verifyWalletProof(challenge,input,{clock:()=>0,verifySignature:async()=>true});
 assert.equal(proof.status,'VERIFIED_PROOF');assert.equal('transfersEnabled' in proof,false);
});
test('CES legacy automation is disabled',()=>{
 assert.equal(cesReadAdapterConfig().status,'DISABLED');
 assert.equal(cesReadAdapterConfig().automatedLogin,false);
});

test('rejects obsolete or unsupported proof envelopes before invoking verifier',async()=>{
 await assert.rejects(verifyWalletProof(challenge,{...input,signature:'not-base64!'},{clock:()=>0,verifySignature:async()=>true}),/unsupported_wallet_signature_format/);
 await assert.rejects(verifyWalletProof(challenge,{...input,scheme:'LEGACY'},{clock:()=>0,verifySignature:async()=>true}),/unsupported_wallet_signature_format/);
});

test('standard base64 signature envelope does not imply verified cryptography',async()=>{
 const received=[];
 const result=await verifyWalletProof(challenge,input,{clock:()=>0,verifySignature:async params=>{received.push(params);return false;}}).catch(e=>e.message);
 assert.equal(result,'wallet_signature_invalid');
 assert.equal(received[0].signature,'YWJjZA==');
});
