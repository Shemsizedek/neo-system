// COUNTERPAY-008 — BIP174 unsigned P2WPKH PSBT construction.
// Offline only. No private keys, network calls, signing, finalizing or broadcasting.
import * as bitcoin from 'bitcoinjs-lib';
import {validateBitcoinAddress} from './bitcoin-readonly.mjs';

const networks={mainnet:bitcoin.networks.bitcoin,testnet:bitcoin.networks.testnet};
const hex64=/^[0-9a-f]{64}$/i;
const isP2WPKH=script=>script.length===22&&script[0]===0&&script[1]===20;
const sat=n=>Number.isSafeInteger(n)&&n>=0;

export async function constructUnsignedPsbt({network,inputs,recipient,changeAddress,amountSats,changeSats,maximumFeeSats=100000}) {
  const chain=networks[network];
  if(!chain)throw Error('Unsupported network');
  await validateBitcoinAddress(recipient,network);
  if(changeSats)await validateBitcoinAddress(changeAddress,network);
  if(!Array.isArray(inputs)||!inputs.length||inputs.length>100)throw Error('Invalid input list');
  if(!sat(amountSats)||amountSats<546||!sat(changeSats)||!sat(maximumFeeSats))throw Error('Invalid payment, change or fee cap');
  const psbt=new bitcoin.Psbt({network:chain});
  const seen=new Set();let total=0;
  for(const input of inputs){
    if(!hex64.test(input?.txid)||!Number.isInteger(input?.vout)||input.vout<0||!sat(input?.satoshis)||input.satoshis<546||input.confirmed!==true)throw Error('Verified confirmed UTXO metadata required');
    if(typeof input.scriptPubKeyHex!=='string'||!/^[a-f0-9]{44}$/i.test(input.scriptPubKeyHex))throw Error('Verified P2WPKH script required');
    const script=Buffer.from(input.scriptPubKeyHex,'hex');
    if(!isP2WPKH(script))throw Error('Only P2WPKH supported');
    const key=input.txid.toLowerCase()+':'+input.vout;if(seen.has(key))throw Error('Duplicate outpoint');seen.add(key);
    psbt.addInput({hash:input.txid,index:input.vout,witnessUtxo:{script,value:input.satoshis}});
    total+=input.satoshis;
    if(!Number.isSafeInteger(total))throw Error('Unsafe total');
  }
  psbt.addOutput({address:recipient,value:amountSats});
  if(changeSats){if(changeSats<294)throw Error('Dust change');psbt.addOutput({address:changeAddress,value:changeSats})}
  const fee=total-amountSats-changeSats;
  if(!sat(fee)||fee>maximumFeeSats)throw Error('Fee outside allowed bounds');
  const base64=psbt.toBase64();
  const restored=bitcoin.Psbt.fromBase64(base64,{network:chain});
  if(restored.inputCount!==inputs.length||restored.txOutputs.length!==(changeSats?2:1))throw Error('PSBT round-trip mismatch');
  const outputs=restored.txOutputs;
  const expected=[{address:recipient,value:amountSats},...(changeSats?[{address:changeAddress,value:changeSats}]:[])];
  expected.forEach((o,i)=>{
    if(outputs[i].value!==o.value||!outputs[i].script.equals(bitcoin.address.toOutputScript(o.address,chain)))throw Error('PSBT output verification failed');
  });
  return Object.freeze({schema:'counterpay.bip174-unsigned.v1',network,psbtBase64:base64,inputCount:inputs.length,outputs:expected,feeSats:fee,
    unsigned:true,broadcast:false,warning:'Signer must independently verify UTXO authenticity, ownership, fee, change, network and outputs. This module does not do so.'});
}
