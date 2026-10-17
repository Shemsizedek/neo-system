import test from 'node:test';
import assert from 'node:assert/strict';
import * as bitcoin from 'bitcoinjs-lib';
import {constructUnsignedPsbt} from './psbt-builder.mjs';
const network=bitcoin.networks.testnet;
const recipient=bitcoin.payments.p2wpkh({hash:Buffer.alloc(20,2),network}).address;
const changeAddress=bitcoin.payments.p2wpkh({hash:Buffer.alloc(20,3),network}).address;
const source=bitcoin.payments.p2wpkh({hash:Buffer.alloc(20,1),network});
const inputs=[{txid:'a'.repeat(64),vout:0,satoshis:100000,confirmed:true,scriptPubKeyHex:source.output.toString('hex')}];
const args={network:'testnet',inputs,recipient,changeAddress,amountSats:50000,changeSats:49000,maximumFeeSats:2000};
test('constructs BIP174 PSBT with verified output roundtrip',async()=>{
 const result=await constructUnsignedPsbt(args);const psbt=bitcoin.Psbt.fromBase64(result.psbtBase64,{network});
 assert.equal(psbt.inputCount,1);assert.equal(psbt.txOutputs.length,2);assert.equal(result.feeSats,1000);assert.equal(result.broadcast,false);
});
test('rejects excess fee',async()=>await assert.rejects(constructUnsignedPsbt({...args,maximumFeeSats:500}),/Fee/));
test('rejects malformed script',async()=>await assert.rejects(constructUnsignedPsbt({...args,inputs:[{...inputs[0],scriptPubKeyHex:'00'}]}),/script/));
test('rejects duplicate outpoints',async()=>await assert.rejects(constructUnsignedPsbt({...args,inputs:[inputs[0],inputs[0]]}),/Duplicate/));
test('rejects network mismatch',async()=>await assert.rejects(constructUnsignedPsbt({...args,network:'mainnet'}),/address|network|checksum/i));
