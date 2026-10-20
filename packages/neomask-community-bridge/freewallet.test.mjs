import assert from 'node:assert/strict';
import {createFreewalletCompanion} from './freewallet.mjs';
import {bitcoin,ECPair} from '../../apps/neomask-extension/src/wallet.mjs';
// Synthetic fixture key. Never funded or broadcast.
const key=ECPair.fromPrivateKey(Uint8Array.from({length:32},(_,i)=>i===31?1:0));
const source=bitcoin.payments.p2pkh({pubkey:key.publicKey}).address;
const script=bitcoin.address.toOutputScript(source);
const prev=new bitcoin.Transaction();prev.addInput(new Uint8Array(32),0xffffffff);prev.addOutput(script,100000n);
const p=new bitcoin.Psbt();p.addInput({hash:prev.getId(),index:0,nonWitnessUtxo:prev.toBuffer()});p.addOutput({address:'18SzD3cfwCcV9p6C38ho4uZPHE8ygVB9iq',value:99000n});
let keyReads=0,allow=true,type=1,unlocked=true,review;
const runtime={FW:{WALLET_NETWORK:1,WALLET_ADDRESS:source},getWallet:()=>unlocked?'fixture':null,getWalletAddressInfo:()=>({type}),getPrivateKey:()=>{keyReads++;return key.toWIF();}};
const host=createFreewalletCompanion({runtime,ledger:'cp20',approve:async r=>{review=r;return allow;}});
const base={origin:'https://merchant.example',session:'test-session'};
const call=(method,params={})=>host({...base,method,params:{ledger:'cp20',...params}});
await call('connect');assert.equal(keyReads,0);
allow=false;await assert.rejects(()=>call('signPsbt',{hex:p.toHex(),options:{signInputs:{[source]:[0]}}}),/declined/);assert.equal(keyReads,0);
allow=true;
const signed=bitcoin.Psbt.fromHex(await call('signPsbt',{hex:p.toHex(),options:{signInputs:{[source]:[0]}}}));
assert(signed.data.inputs[0].finalScriptSig);assert.equal(keyReads,1);assert.equal(review.summary.feeSats,'1000');
const tx=signed.extractTransaction();assert.equal(tx.version,2);assert.equal(tx.outs.length,1);assert.equal(tx.outs[0].value,99000n);assert.deepEqual(tx.outs[0].script,p.txOutputs[0].script);
// Verify the real ECDSA signature against the original transaction digest.
const parts=bitcoin.script.decompile(tx.ins[0].script);const decoded=bitcoin.script.signature.decode(parts[0]);assert.equal(decoded.hashType,1);
const ecc=await import('@bitcoinerlab/secp256k1');assert(ecc.verify(tx.hashForSignature(0,script,1),parts[1],decoded.signature));
type=3;await assert.rejects(()=>call('getAccount'),/Legacy/);type=1;
unlocked=false;await assert.rejects(()=>call('getAccount'),/Unlock/);unlocked=true;
runtime.FW.WALLET_NETWORK=2;await assert.rejects(()=>call('getAccount'),/mainnet/);
console.log('Freewallet companion: actual PSBT/ECDSA signing, exact outputs/version/fees, decline-before-key-access, lock/watch-only/network checks passed.');
