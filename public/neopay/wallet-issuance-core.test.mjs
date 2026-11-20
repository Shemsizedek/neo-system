import test from 'node:test';
import assert from 'node:assert/strict';
import {makeWalletIssuer} from './wallet-issuance-core.mjs';
const phrase = Array(24).fill('example').join(' ');
function harness({secure=true,valid=true,failAttach=false}={}){
  let address=null,seed=null,clearCount=0,entropyBits=0;
  const issuer=makeWalletIssuer({
    generateMnemonic:(_wordlist,bits)=>{entropyBits=bits;return phrase},
    validateMnemonic:mnemonic=>valid&&mnemonic===phrase,
    mnemonicToSeed:async()=>{seed=new Uint8Array(64).fill(42);return seed},
    wordlist:['example'],
    attachSeed:()=>{if(failAttach)throw new Error('broken derivation');address='1QTestAddress';return{address,path:"m/44'/0'/0'/0/0"}},
    clearSigner:()=>{address=null;clearCount++},
    getAddress:()=>address,
    requireSecureContext:()=>{if(!secure)throw new Error('HTTPS required')},
  });
  return {issuer,stats:()=>({seed,address,clearCount,entropyBits})};
}
test('creates a 256-bit, 24-word wallet and wipes intermediate seed',async()=>{
  const h=harness(),result=await h.issuer.create();
  assert.equal(result.mnemonic,phrase);
  assert.equal(result.mode,'bip39');
  assert.equal(result.path,"m/44'/0'/0'/0/0");
  assert.equal(h.stats().entropyBits,256);
  assert.ok(h.stats().seed.every(b=>b===0));
  assert.equal(h.issuer.getAddress(),result.address);
  h.issuer.clear();assert.equal(h.issuer.getAddress(),null);
});
test('recovers same address via the BIP39 route',async()=>{
  const h=harness(),first=await h.issuer.create();h.issuer.clear();
  const recovered=await h.issuer.restore('  '+phrase.toUpperCase()+'  ');
  assert.equal(recovered.address,first.address);
  assert.equal(recovered.addresses.length,1);
  assert.ok(h.stats().seed.every(b=>b===0));
});
test('rejects invalid mnemonic and does not leave signer active',async()=>{
  const h=harness();await h.issuer.create();
  await assert.rejects(h.issuer.restore('bad words'),/valid 12- or 24-word/);
  assert.equal(h.issuer.getAddress(),null);
});
test('refuses creation without secure context',async()=>{
  const h=harness({secure:false});await assert.rejects(h.issuer.create(),/HTTPS/);
  assert.equal(h.stats().entropyBits,0);
});
test('clears keys after derivation failure',async()=>{
  const h=harness({failAttach:true});await assert.rejects(h.issuer.create(),/broken derivation/);
  assert.ok(h.stats().seed.every(b=>b===0));
  assert.equal(h.issuer.getAddress(),null);
});
