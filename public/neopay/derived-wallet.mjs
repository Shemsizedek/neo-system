import { HDKey } from 'https://esm.sh/@scure/bip32@1.7.0';
import { secp256k1 } from 'https://esm.sh/@noble/curves@1.8.1/secp256k1';
import { sha256 } from 'https://esm.sh/@noble/hashes@1.7.1/sha256';
import { ripemd160 } from 'https://esm.sh/@noble/hashes@1.7.1/ripemd160';
import { base58check } from 'https://esm.sh/@scure/base@1.2.4';

const PATH="m/44'/0'/0'/0/0";
const b58=base58check(sha256);
let session=null;
const enc=new TextEncoder();
const hash160=b=>ripemd160(sha256(b));
const p2pkh=pub=>b58.encode(Uint8Array.from([0x00,...hash160(pub)]));
const zero=b=>b?.fill?.(0);

function attachSeed(seed){
  clear();
  const child=HDKey.fromMasterSeed(seed).derive(PATH);
  if(!child.privateKey||!child.publicKey)throw new Error('Unable to derive the Bitcoin account key.');
  const privateKey=new Uint8Array(child.privateKey),publicKey=new Uint8Array(child.publicKey),address=p2pkh(publicKey);
  session={privateKey,publicKey,address,path:PATH};
  zero(seed);
  return{address,path:PATH,publicKey:new Uint8Array(publicKey)};
}
function signDigest(digest){
  if(!session)throw new Error('Wallet signer is locked.');
  const d=digest instanceof Uint8Array?digest:new Uint8Array(digest);
  if(d.length!==32)throw new Error('A 32-byte digest is required for signing.');
  return secp256k1.sign(d,session.privateKey,{lowS:true,prehash:false}).toCompactRawBytes();
}
function proveMessage(message){
  if(!session)throw new Error('Wallet signer is locked.');
  const digest=sha256(enc.encode(String(message)));
  const signature=signDigest(digest);
  const verified=secp256k1.verify(signature,digest,session.publicKey,{lowS:true,prehash:false});
  return{verified,signature:[...signature],publicKey:[...session.publicKey],address:session.address,path:PATH};
}
function verifyAddress(expected){const e=String(expected||'').trim();return{matched:!!session&&!!e&&e===session.address,address:session?.address||null,path:PATH}}
function clear(){if(session?.privateKey)zero(session.privateKey);session=null}
window.NEODerivedWallet={attachSeed,signDigest,proveMessage,verifyAddress,clear,getAddress:()=>session?.address||null,getPublicKey:()=>session?new Uint8Array(session.publicKey):null,path:PATH};
