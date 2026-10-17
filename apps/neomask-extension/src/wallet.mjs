import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from '@bitcoinerlab/secp256k1';
import {ECPairFactory} from 'ecpair';
import {Buffer} from 'buffer';
import {decodeBondOutput} from './counterparty.mjs';
const ECPair=ECPairFactory(ecc);
const network=bitcoin.networks.bitcoin;
const rounds=600000;
const to64=bytes=>Buffer.from(bytes).toString('base64');
const from64=text=>Uint8Array.from(Buffer.from(text,'base64'));
function account(wif){
 const key=ECPair.fromWIF(wif,network);
 if(!key.compressed)throw new Error('Compressed mainnet WIF required');
 const address=bitcoin.payments.p2pkh({pubkey:key.publicKey,network}).address;
 return {key,address};
}
function passwordCheck(password){if(typeof password!=='string'||password.length<12||password.length>1024)throw new Error('Use a vault password of 12–1024 characters');}
async function derive(password,salt){
 passwordCheck(password);
 const base=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:rounds,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export function createKey(){
 const key=ECPair.makeRandom({network,rng:size=>crypto.getRandomValues(new Uint8Array(size))});
 return {wif:key.toWIF(),address:bitcoin.payments.p2pkh({pubkey:key.publicKey,network}).address};
}
export async function sealWif(wif,password){
 const {address}=account(wif),salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
 const key=await derive(password,salt);
 const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(address)},key,new TextEncoder().encode(wif));
 return {v:1,kdf:'PBKDF2-SHA256',iterations:rounds,address,salt:to64(salt),iv:to64(iv),ciphertext:to64(new Uint8Array(ciphertext))};
}
export async function openVault(record,password){
 if(record?.v!==1||record.iterations!==rounds||record.kdf!=='PBKDF2-SHA256')throw new Error('Unsupported vault format');
 const salt=from64(record.salt),iv=from64(record.iv),ciphertext=from64(record.ciphertext);
 if(salt.length!==16||iv.length!==12||ciphertext.length<16||ciphertext.length>2048)throw new Error('Invalid vault');
 const key=await derive(password,salt);
 let plain;
 try{plain=await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(record.address)},key,ciphertext);}
 catch{throw new Error('Incorrect password or damaged vault');}
 const bytes=new Uint8Array(plain);
 try{
  const wif=new TextDecoder().decode(bytes);
  if(account(wif).address!==record.address)throw new Error('Vault account mismatch');
  return wif;
 }finally{bytes.fill(0);}
}
function parsePsbt(hex){
 if(typeof hex!=='string'||hex.length>800000||!/^70736274ff(?:[0-9a-f]{2})+$/i.test(hex))throw new Error('PSBT hex required');
 return bitcoin.Psbt.fromHex(hex,{network});
}
export async function psbtDigest(hex){
 return Buffer.from(await crypto.subtle.digest('SHA-256',Buffer.from(hex,'hex'))).toString('hex');
}
export function reviewPsbt(hex,source,ledger){
 const psbt=parsePsbt(hex),sourceScript=bitcoin.address.toOutputScript(source,network);
 if(!source.startsWith('1')||!psbt.inputCount||psbt.inputCount>100||psbt.txOutputs.length>100)throw new Error('Unsupported transaction shape');
 let inputTotal=0n;
 psbt.data.inputs.forEach((input,i)=>{
  if(input.sighashType!==undefined&&input.sighashType!==bitcoin.Transaction.SIGHASH_ALL)throw new Error('Only SIGHASH_ALL is permitted');
  if(input.finalScriptSig||input.finalScriptWitness||input.partialSig?.length)throw new Error('Already signed PSBT rejected');
  if(!input.nonWitnessUtxo)throw new Error('Full previous transaction required for legacy input');
  const prev=bitcoin.Transaction.fromBuffer(input.nonWitnessUtxo),txInput=psbt.txInputs[i];
  const wanted=Buffer.from(txInput.hash).reverse().toString('hex');
  if(prev.getId()!==wanted)throw new Error('Previous transaction ID mismatch');
  const output=prev.outs[txInput.index];
  if(!output||!Buffer.from(output.script).equals(Buffer.from(sourceScript)))throw new Error('Input is not owned by this wallet');
  inputTotal+=output.value;
 });
 let outputTotal=0n,assetTransfer=null;
 const outputs=psbt.txOutputs.map(output=>{
  outputTotal+=output.value;
  if(output.script[0]===bitcoin.opcodes.OP_RETURN){
   if(assetTransfer||output.value!==0n)throw new Error('Multiple or funded data outputs rejected');
   assetTransfer=decodeBondOutput({script:output.script,firstInputHash:psbt.txInputs[0].hash,ledger});
   return {type:'counterparty',sats:'0'};
  }
  let destination;
  try{destination=bitcoin.address.fromOutputScript(output.script,network);}
  catch{throw new Error('Data or unknown output rejected: Counterparty asset messages require a verified decoder before signing');}
  if(!destination.startsWith('1')&&!destination.startsWith('3')&&!destination.startsWith('bc1'))throw new Error('Unknown Bitcoin destination');
  return {address:destination,sats:output.value.toString(),change:destination===source};
 });
 const fee=inputTotal-outputTotal;
 if(fee<0n||fee>100000n)throw new Error('Fee outside wallet limit (0–100,000 sats)');
 if(assetTransfer){
  for(const output of outputs){
   if(output.type==='counterparty'||output.change)continue;
   if(output.address!==assetTransfer.destination||BigInt(output.sats)>10000n)throw new Error('Unexpected BTC recipient or excessive destination dust in asset send');
  }
 }else if(!outputs.some(output=>!output.change))throw new Error('No external recipient');
 return {source,network:'mainnet',inputs:psbt.inputCount,inputSats:inputTotal.toString(),outputs,feeSats:fee.toString(),
  signingMode:'legacy-p2pkh-sighash-all',counterpartyData:Boolean(assetTransfer),assetTransfer};
}
export async function signReviewedPsbt({hex,wif,approvedDigest,ledger}){
 const {key,address}=account(wif);
 reviewPsbt(hex,address,ledger);
 if(await psbtDigest(hex)!==approvedDigest)throw new Error('Transaction changed after review');
 const psbt=parsePsbt(hex);
 psbt.signAllInputs(key,[bitcoin.Transaction.SIGHASH_ALL]);
 if(!psbt.validateSignaturesOfAllInputs((pub,hash,signature)=>ecc.verify(hash,pub,signature)))throw new Error('Signature verification failed');
 psbt.finalizeAllInputs();
 const transaction=psbt.extractTransaction();
 return {psbtHex:psbt.toHex(),rawTx:transaction.toHex(),txid:transaction.getId()};
}
export {bitcoin,ECPair};

