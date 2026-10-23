// COUNTERPAY-007 deterministic Bitcoin funding manifest — NOT a PSBT.
// Assumes only confirmed P2WPKH inputs, P2WPKH payment/change outputs.
// No key material, serialization, signature or broadcast is produced.
const MAX=2100000000000000n;
function positiveInteger(value,label){if(!Number.isSafeInteger(value)||value<1)throw Error('Invalid '+label);return BigInt(value)}
function feeRate(value){if(typeof value!=='number'||!Number.isFinite(value)||value<1||value>1000)throw Error('Invalid sat/vB fee rate');return value}
function fee(vbytes,rate){return BigInt(Math.ceil(vbytes*rate))}
export function makeFundingManifest({network,utxos,recipient,changeAddress,amountSats,satPerVbyte}){
  if(!['testnet','mainnet'].includes(network))throw Error('Unsupported network');
  if(typeof recipient!=='string'||typeof changeAddress!=='string'||recipient===changeAddress)throw Error('Distinct recipient and change required');
  if(!Array.isArray(utxos)||!utxos.length||utxos.length>500)throw Error('UTXO set unavailable');
  const amount=positiveInteger(amountSats,'amount'),rate=feeRate(satPerVbyte);
  if(amount>MAX)throw Error('Amount exceeds Bitcoin supply');
  const available=utxos.map(x=>{
    if(!/^[a-f0-9]{64}$/i.test(x.txid)||!Number.isInteger(x.vout)||x.vout<0||!Number.isSafeInteger(x.satoshis)||x.satoshis<1||x.confirmed!==true)throw Error('Confirmed safe UTXO required');
    return {txid:x.txid.toLowerCase(),vout:x.vout,satoshis:x.satoshis}
  }).sort((a,b)=>b.satoshis-a.satoshis||a.txid.localeCompare(b.txid)||a.vout-b.vout);
  const seen=new Set();
  for(const x of available){const key=x.txid+':'+x.vout;if(seen.has(key))throw Error('Duplicate outpoint');seen.add(key)}
  let total=0n;const selected=[];let finalFee=0n,change=0n,hasChange=false;
  for(const coin of available){
    selected.push(coin);total+=BigInt(coin.satoshis);
    // Conservative P2WPKH estimate; actual witness/weight must be verified by signer.
    const withChange=fee(11+68*selected.length+31*2,rate);
    const candidate=total-amount-withChange;
    if(candidate>=294n){finalFee=withChange;change=candidate;hasChange=true;break}
    const withoutChange=fee(11+68*selected.length+31,rate);
    if(total>=amount+withoutChange){finalFee=total-amount;change=0n;hasChange=false;break}
  }
  if(!finalFee)throw Error('Insufficient confirmed funds for amount and estimated fees');
  if(finalFee>BigInt(Number.MAX_SAFE_INTEGER)||change>BigInt(Number.MAX_SAFE_INTEGER))throw Error('Unsafe integer range');
  return Object.freeze({
    schema:'counterpay.bitcoin-funding-preview.v1',network,recipient,changeAddress,
    amountSats:Number(amount),feeSats:Number(finalFee),changeSats:Number(change),
    inputs:selected,outputs:[{role:'payment',address:recipient,satoshis:Number(amount)},...(hasChange?[{role:'change',address:changeAddress,satoshis:Number(change)}]:[])],
    signatureRequired:true,psbt:null,transactionHex:null,broadcast:false,
    caution:'Preview estimates only; unverified script types, provenance and fees. Not a PSBT or spend authorization.'
  });
}
export function deviceAuthorizationChallenge(manifest){
  if(manifest?.schema!=='counterpay.bitcoin-funding-preview.v1'||manifest.psbt!==null||manifest.broadcast!==false)throw Error('Unsafe transaction state');
  return Object.freeze({schema:'neo.pass.device-review.v1',network:manifest.network,
    amountSats:manifest.amountSats,feeSats:manifest.feeSats,outputs:manifest.outputs,
    status:'NOT_AUTHORIZED',signature:null,deviceId:null,
    note:'Display-only challenge. No biometric proof, WebAuthn assertion or wallet signing is performed.'});
}
