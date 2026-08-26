import { HDKey } from 'https://esm.sh/@scure/bip32@1.7.0';
import { secp256k1 } from 'https://esm.sh/@noble/curves@1.8.1/secp256k1';
import { sha256 } from 'https://esm.sh/@noble/hashes@1.7.1/sha256';
import { ripemd160 } from 'https://esm.sh/@noble/hashes@1.7.1/ripemd160';
import { base58check } from 'https://esm.sh/@scure/base@1.2.4';

const WORDLIST_URL='https://raw.githubusercontent.com/CounterpartyXCP/counterwallet/master/src/js/external/mnemonic.js';
const BASE_PATH="m/0'/0/";
const b58=base58check(sha256);
const enc=new TextEncoder();
let legacyWords=null;
let signer=null;
const mod=(a,n)=>((a%n)+n)%n;
const hash160=b=>ripemd160(sha256(b));
const p2pkh=pub=>b58.encode(Uint8Array.from([0x00,...hash160(pub)]));
const zero=b=>b?.fill?.(0);
const clean=s=>String(s||'').trim().toLowerCase().replace(/\s+/g,' ');

async function loadWords(){
  if(legacyWords)return legacyWords;
  const r=await fetch(WORDLIST_URL,{cache:'force-cache'});
  if(!r.ok)throw new Error('Classic Counterwallet wordlist could not be loaded. Check your connection and try again.');
  const text=await r.text();
  const m=text.match(/Mnemonic\.words\s*=\s*JSON\.parse\('([^']+)'\)/s);
  if(!m)throw new Error('Classic Counterwallet wordlist format is unavailable.');
  const words=JSON.parse(m[1]);
  if(!Array.isArray(words)||words.length!==1626)throw new Error('Classic Counterwallet wordlist failed integrity checks.');
  legacyWords=words;
  return words;
}

async function decodePhrase(phrase){
  const raw=clean(phrase),parts=raw.split(' ');
  const old=parts.length===13&&parts[0]==='old';
  const words=old?parts.slice(1):parts;
  if(words.length!==12)return null;
  const list=await loadWords();
  const indexes=words.map(w=>list.indexOf(w));
  if(indexes.some(i=>i<0))return null;
  const seed=new Uint8Array(16);
  for(let g=0;g<4;g++){
    const w1=indexes[g*3],w2=indexes[g*3+1],w3=indexes[g*3+2];
    const value=(w1+1626*mod(w2-w1,1626)+1626*1626*mod(w3-w2,1626))>>>0;
    seed[g*4]=(value>>>24)&255;seed[g*4+1]=(value>>>16)&255;seed[g*4+2]=(value>>>8)&255;seed[g*4+3]=value&255;
  }
  return{seed,old,words};
}

function deriveEntries(seed,count=20){
  const root=HDKey.fromMasterSeed(seed),entries=[];
  for(let i=0;i<count;i++){
    const path=BASE_PATH+i,child=root.derive(path);
    if(!child.privateKey||!child.publicKey)continue;
    entries.push({index:i,path,address:p2pkh(child.publicKey),privateKey:new Uint8Array(child.privateKey),publicKey:new Uint8Array(child.publicKey)});
  }
  return entries;
}

async function unlock(phrase,preferredAddress=''){
  clear();
  const decoded=await decodePhrase(phrase);
  if(!decoded)return null;
  if(decoded.old)throw new Error('This passphrase is marked as a pre-May-2014 Counterwallet wallet. Use Old Counterwallet recovery mode; automatic old-key conversion is not enabled yet.');
  const entries=deriveEntries(decoded.seed,50);
  zero(decoded.seed);
  if(!entries.length)throw new Error('No Counterwallet addresses could be derived.');
  const preferred=String(preferredAddress||'').trim();
  const selected=entries.find(x=>x.address===preferred)||entries[0];
  for(const e of entries){if(e!==selected)zero(e.privateKey)}
  signer=selected;
  const fingerprint=Array.from(sha256(enc.encode(`${selected.address}:${selected.path}`)).slice(0,8)).map(x=>x.toString(16).padStart(2,'0')).join('');
  return{mode:'counterwallet-classic',fingerprint,address:selected.address,path:selected.path,index:selected.index,matchedSaved:!!preferred&&selected.address===preferred,addresses:entries.map(x=>({address:x.address,path:x.path,index:x.index}))};
}

function signDigest(digest){
  if(!signer)throw new Error('Classic Counterwallet signer is locked.');
  const d=digest instanceof Uint8Array?digest:new Uint8Array(digest);
  if(d.length!==32)throw new Error('A 32-byte digest is required.');
  return secp256k1.sign(d,signer.privateKey,{lowS:true,prehash:false}).toCompactRawBytes();
}
function proveMessage(message){
  if(!signer)throw new Error('Classic Counterwallet signer is locked.');
  const digest=sha256(enc.encode(String(message))),signature=signDigest(digest);
  return{verified:secp256k1.verify(signature,digest,signer.publicKey,{lowS:true,prehash:false}),signature:[...signature],publicKey:[...signer.publicKey],address:signer.address,path:signer.path};
}
function clear(){if(signer?.privateKey)zero(signer.privateKey);signer=null}
window.NEOCounterwalletCompat={unlock,decodePhrase,signDigest,proveMessage,clear,getAddress:()=>signer?.address||null,getPath:()=>signer?.path||null};
