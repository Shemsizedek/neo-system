import { HDKey } from 'https://esm.sh/@scure/bip32@1.7.0';
import { secp256k1 } from 'https://esm.sh/@noble/curves@1.8.1/secp256k1';
import { sha256 } from 'https://esm.sh/@noble/hashes@1.7.1/sha256';
import { ripemd160 } from 'https://esm.sh/@noble/hashes@1.7.1/ripemd160';
import { base58check } from 'https://esm.sh/@scure/base@1.2.4';

const PATH="m/44'/0'/0'/0/0";
let session=null;
const b58=base58check(sha256);
const hash160=b=>ripemd160(sha256(b));
const p2pkh=pub=>b58.encode(Uint8Array.from([0x00,...hash160(pub)]));

function zero(buf){if(buf?.fill)buf.fill(0)}
function attachSeed(seed){
  clear();
  const root=HDKey.fromMasterSeed(seed);
  const child=root.derive(PATH);
  if(!child.privateKey||!child.publicKey)throw new Error('Unable to derive Bitcoin signing key.');
  const privateKey=new Uint8Array(child.privateKey);
  const publicKey=new Uint8Array(child.publicKey);
  const address=p2pkh(publicKey);
  session={path:PATH,address,publicKey,privateKey};
  zero(seed);
  window.dispatchEvent(new CustomEvent('neo-wallet-derived',{detail:{address,path:PATH,publicKey:[...publicKey]}}));
  return {address,path:PATH,publicKey};
}
function signDigest(digest){
  if(!session)throw new Error('Wallet signer is locked.');
  const bytes=digest instanceof Uint8Array?digest:new Uint8Array(digest);
  if(bytes.length!==32)throw new Error('Signing requires a 32-byte transaction digest.');
  const sig=secp256k1.sign(bytes,session.privateKey,{lowS:true,prehash:false});
  return sig.toCompactRawBytes();
}
function verifyAddress(expected){
  if(!session)return{matched:false,address:null};
  const target=String(expected||'').trim();
  return{matched:!!target&&target===session.address,address:session.address,path:PATH};
}
function clear(){if(session?.privateKey)zero(session.privateKey);session=null}
window.NEODerivedWallet={attachSeed,signDigest,verifyAddress,clear,getAddress:()=>session?.address||null,getPublicKey:()=>session?new Uint8Array(session.publicKey):null,path:PATH};
