import {Transaction} from '@scure/btc-signer';
import {hex} from '@scure/base';
import {decode} from 'cborg';
import {addressScriptPubKey} from '@xcp/wallet-sdk';
export const STAN=Object.freeze({source:'1Ky2wRYYrJzqdQJH64F7TR98fqLxJs7LK8',asset:'STANSHARES',quantity:'1000',divisible:false,lock:false,reset:false,description:'James A Stanback Inc. tokenized common shares'});
export function readTx(raw){return Transaction.fromRaw(hex.decode(raw),{allowUnknownInputs:true,allowUnknownOutputs:true,disableScriptCheck:true});}
// ARC4 is protocol obfuscation, not wallet encryption. Algorithm follows XCP/extension (MIT).
export function arc4(key,data){const s=Uint8Array.from({length:256},(_,i)=>i);let j=0;for(let i=0;i<256;i++){j=(j+s[i]+key[i%key.length])&255;[s[i],s[j]]=[s[j],s[i]];}const out=new Uint8Array(data.length);let a=0,b=0;for(let i=0;i<data.length;i++){a=(a+1)&255;b=(b+s[a])&255;[s[a],s[b]]=[s[b],s[a]];out[i]=data[i]^s[(s[a]+s[b])&255];}return out;}
function payload(script){if(script[0]!==106)throw Error('OP_RETURN required');let n=script[1],o=2;if(n===76){n=script[2];o=3;}else if(n===77){n=script[2]|script[3]<<8;o=4;}else if(n>75)throw Error('Unsupported data push');if(o+n!==script.length)throw Error('Malformed OP_RETURN');return script.slice(o);}
const flag=x=>x===true||x===1||x===1n?true:x===false||x===0||x===0n?false:null;
export function verifyIssuance(raw,intent){
 const tx=readTx(raw);if(!tx.inputsLength||!tx.outputsLength||tx.inputsLength>50)throw Error('Invalid transaction shape');
 const script=addressScriptPubKey(intent.source),data=[];
 for(let i=0;i<tx.outputsLength;i++){const out=tx.getOutput(i);if(out.script?.[0]===106){if(out.amount!==0n)throw Error('Data output must have zero value');data.push(payload(out.script));}else if(hex.encode(out.script||new Uint8Array())!==script)throw Error('External output or issuer transfer refused');}
 if(data.length!==1)throw Error('Exactly one Counterparty data output required');
 const first=tx.getInput(0);const clear=arc4(first.txid,data[0]);
 if(new TextDecoder().decode(clear.slice(0,8))!=='CNTRPRTY')throw Error('Counterparty prefix mismatch');
 let offset=9,type=clear[8];if(type===0){type=new DataView(clear.buffer,clear.byteOffset+8,4).getUint32(0);offset=12;}
 if(type!==20&&type!==22)throw Error('Only standard issuance is permitted');
 const p=decode(clear.slice(offset),{useMaps:true,allowIndefinite:false});
 const assetId=[...intent.asset].reduce((a,c)=>a*26n+BigInt(c.charCodeAt(0)-65),0n);
 if(!Array.isArray(p)||p.length!==7||BigInt(p[0])!==assetId||BigInt(p[1])!==BigInt(intent.quantity)||flag(p[2])!==intent.divisible||flag(p[3])!==intent.lock||flag(p[4])!==intent.reset||!(p[6] instanceof Uint8Array)||new TextDecoder('utf-8',{fatal:true}).decode(p[6])!==intent.description||!['','text/plain'].includes(p[5]))throw Error('Issuance bytes do not match the reviewed token details');
 return tx;
}
export async function verifyFunding(raw,intent,maxFee,getParent){
 const tx=verifyIssuance(raw,intent);let total=0n;const seen=new Set(),script=addressScriptPubKey(intent.source);
 for(let i=0;i<tx.inputsLength;i++){const input=tx.getInput(i),id=hex.encode(input.txid),key=id+':'+input.index;if(seen.has(key))throw Error('Duplicate input');seen.add(key);const parent=readTx(await getParent(id));if(parent.id!==id)throw Error('Parent transaction hash mismatch');const out=parent.getOutput(input.index);if(!out||hex.encode(out.script)!==script)throw Error('Input does not belong to issuer');total+=out.amount;}
 for(let i=0;i<tx.outputsLength;i++)total-=tx.getOutput(i).amount;
 if(total<=0n||total>BigInt(maxFee))throw Error('Miner fee is outside the approved maximum');return {feeSats:total.toString(),tx};
}
