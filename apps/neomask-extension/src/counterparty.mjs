import {Buffer} from 'buffer';
import * as bitcoin from 'bitcoinjs-lib';
const ids={TEMPLEBOND:104097026168021n,PLEDGEBOND:83772780026549n};
export function arc4(key,bytes){
 const s=Uint8Array.from({length:256},(_,i)=>i);let j=0;
 for(let i=0;i<256;i++){j=(j+s[i]+key[i%key.length])&255;[s[i],s[j]]=[s[j],s[i]];}
 let i=0;j=0;return Uint8Array.from(bytes,byte=>{i=(i+1)&255;j=(j+s[i])&255;[s[i],s[j]]=[s[j],s[i]];return byte^s[(s[i]+s[j])&255];});
}
function u64(n){const b=Buffer.alloc(8);b.writeBigUInt64BE(BigInt(n));return b;}
function cborUint(n){n=BigInt(n);if(n<24n)return Buffer.from([Number(n)]);return Buffer.concat([Buffer.from([27]),u64(n)]);}
function packedAddress(address,ledger){
 const {version,hash}=bitcoin.address.fromBase58Check(address);
 if(version!==0)throw new Error('Bond destination must be a mainnet P2PKH address');
 return Buffer.concat([Buffer.from([ledger==='cp20'?1:0]),Buffer.from(hash)]);
}
export function encodeBondMessage({asset,quantityAtomic,destination,ledger}){
 if(!['classic','cp20'].includes(ledger)||!ids[asset])throw new Error('Unsupported bond or ledger');
 const quantity=BigInt(quantityAtomic);
 if(quantity<=0n||quantity>9223372036854775807n)throw new Error('Invalid bond quantity');
 const address=packedAddress(destination,ledger);
 const body=ledger==='classic'?Buffer.concat([u64(ids[asset]),u64(quantity),address]):
  Buffer.concat([Buffer.from([0x84]),cborUint(ids[asset]),cborUint(quantity),Buffer.from([0x55]),address,Buffer.from([0x40])]);
 return Buffer.concat([Buffer.from('CNTRPRTY'),Buffer.from([2]),body]);
}
function decodeCbor(body){
 let offset=0;
 function head(major){
  const first=body[offset++];if(first===undefined||(first>>5)!==major)throw new Error('Invalid Counterparty CBOR');
  const size=first&31;if(size<24)return BigInt(size);
  const n={24:1,25:2,26:4,27:8}[size];if(!n||offset+n>body.length)throw new Error('Unsupported Counterparty CBOR');
  let value=0n;for(let i=0;i<n;i++)value=(value<<8n)|BigInt(body[offset++]);return value;
 }
 function bytes(){const length=Number(head(2));if(length>80||offset+length>body.length)throw new Error('Invalid Counterparty bytes');const b=body.subarray(offset,offset+length);offset+=length;return b;}
 if(body[offset++]!==0x84)throw new Error('Enhanced send CBOR array required');
 const assetId=head(0),quantity=head(0),address=bytes(),memo=bytes();
 if(offset!==body.length||memo.length>34)throw new Error('Invalid memo or trailing data');
 return {assetId,quantity,address,memo};
}
export function decodeBondOutput({script,firstInputHash,ledger}){
 if(!['classic','cp20'].includes(ledger))throw new Error('Explicit ledger required for asset signing');
 const chunks=bitcoin.script.decompile(script);
 if(!chunks||chunks.length!==2||chunks[0]!==bitcoin.opcodes.OP_RETURN||!(chunks[1]instanceof Uint8Array))throw new Error('Single Counterparty OP_RETURN data push required');
 const plain=Buffer.from(arc4(Buffer.from(firstInputHash).reverse(),chunks[1]));
 if(!plain.subarray(0,8).equals(Buffer.from('CNTRPRTY')))throw new Error('Unknown data transaction');
 const msg=plain.subarray(8);
 let type,body;
 if(msg[0]>0){type=msg[0];body=msg.subarray(1);}else{if(msg.length<5)throw new Error('Invalid type');type=msg.readUInt32BE(0);body=msg.subarray(4);}
 if(type!==2)throw new Error('Only bounded enhanced bond sends are supported; sweep/issuance/other types rejected');
 let d;
 if(ledger==='cp20')d=decodeCbor(body);
 else{
  if(body.length<37||body.length>71)throw new Error('Invalid classic enhanced-send payload');
  d={assetId:body.readBigUInt64BE(0),quantity:body.readBigUInt64BE(8),address:body.subarray(16,37),memo:body.subarray(37)};
 }
 const asset=Object.keys(ids).find(name=>ids[name]===d.assetId);
 if(!asset||d.quantity<=0n||d.quantity>9223372036854775807n||d.address.length!==21||d.address[0]!== (ledger==='cp20'?1:0))throw new Error('Unsupported bond message or address');
 return {type:'enhanced_send',asset,quantityAtomic:d.quantity.toString(),destination:bitcoin.address.toBase58Check(d.address.subarray(1),0),memoHex:Buffer.from(d.memo).toString('hex'),ledger};
}
export function buildBondPsbt({asset,quantityAtomic,destination,ledger,source,inputs,feeSats}){
 if(!Array.isArray(inputs)||!inputs.length||inputs.length>100)throw new Error('Funding inputs required');
 const psbt=new bitcoin.Psbt(),sourceScript=bitcoin.address.toOutputScript(source);let total=0n;
 for(const input of inputs){
  if(typeof input.previousTx!=='string'||input.previousTx.length>800000||!Number.isSafeInteger(input.index)||input.index<0)throw new Error('Invalid funding input');
  const prev=bitcoin.Transaction.fromHex(input.previousTx),out=prev.outs[input.index];
  if(!out||!Buffer.from(out.script).equals(Buffer.from(sourceScript)))throw new Error('Funding input is not wallet owned');
  psbt.addInput({hash:prev.getId(),index:input.index,nonWitnessUtxo:prev.toBuffer()});total+=out.value;
 }
 const fee=BigInt(feeSats);if(fee<1n||fee>100000n||total-fee<546n)throw new Error('Insufficient BTC or fee outside policy');
 const message=encodeBondMessage({asset,quantityAtomic,destination,ledger});
 const encrypted=arc4(Buffer.from(psbt.txInputs[0].hash).reverse(),message);
 psbt.addOutput({script:bitcoin.script.compile([bitcoin.opcodes.OP_RETURN,encrypted]),value:0n});
 psbt.addOutput({address:source,value:total-fee});
 return psbt.toHex();
}

