import test from 'node:test'
import assert from 'node:assert/strict'
import {verifyBitcoinIncidentResolution} from './bitcoinIncidentEvidence.mjs'
const A='a'.repeat(64),B='b'.repeat(64),C='c'.repeat(64)
const incident={id:'INC-1',payoutId:'P-1'}, payout={id:'P-1',txid:A}
const notFound=()=>{throw new Error('BITCOIN_RPC_-5:No such mempool or blockchain transaction')}

test('confirmed resolution accepts wallet-backed Bitcoin Core confirmation',async()=>{
 const rpc=async(method)=>method==='gettransaction'?{txid:A,confirmations:2,blockhash:'block',trusted:true}:null
 const proof=await verifyBitcoinIncidentResolution({incident,payout,resolutionCode:'TX_CONFIRMED',rpc})
 assert.equal(proof.verified,true);assert.equal(proof.evidence.wallet.confirmations,2)
})

test('caller cannot claim confirmation without Bitcoin Core evidence',async()=>{
 const rpc=async()=>notFound()
 await assert.rejects(()=>verifyBitcoinIncidentResolution({incident,payout,resolutionCode:'TX_CONFIRMED',rpc}),/TX_NOT_CONFIRMED/)
})

test('not-broadcast requires synced txindex plus chain, wallet, and mempool absence',async()=>{
 const rpc=async(method)=>{if(method==='getindexinfo')return {txindex:{synced:true,best_block_height:900000}};return notFound()}
 const proof=await verifyBitcoinIncidentResolution({incident,payout,resolutionCode:'TX_NOT_BROADCAST',rpc})
 assert.equal(proof.evidence.index.synced,true);assert.equal(proof.evidence.raw.found,false);assert.equal(proof.evidence.mempool.found,false)
})

test('not-broadcast cannot be asserted when txindex is unavailable',async()=>{
 const rpc=async(method)=>method==='getindexinfo'?{}:notFound()
 await assert.rejects(()=>verifyBitcoinIncidentResolution({incident,payout,resolutionCode:'TX_NOT_BROADCAST',rpc}),/TXINDEX_REQUIRED/)
})

test('not-broadcast is rejected if transaction exists in mempool',async()=>{
 const rpc=async(method)=>{if(method==='getindexinfo')return {txindex:{synced:true,best_block_height:900000}};if(method==='getmempoolentry')return {vsize:200};return notFound()}
 await assert.rejects(()=>verifyBitcoinIncidentResolution({incident,payout,resolutionCode:'TX_NOT_BROADCAST',rpc}),/TRANSACTION_PRESENT/)
})

test('replacement must spend an input from the original transaction',async()=>{
 const rpc=async(method,params)=>{const id=params?.[0];if(method==='gettransaction')return notFound();if(method==='getrawtransaction'){if(id===A)return {txid:A,confirmations:0,vin:[{txid:C,vout:0}]};if(id===B)return {txid:B,confirmations:0,vin:[{txid:C,vout:0}]};return notFound()}if(method==='getmempoolentry'){if(id===B)return {vsize:180};return notFound()}}
 const proof=await verifyBitcoinIncidentResolution({incident,payout,resolutionCode:'TX_REPLACED',replacementTxid:B,rpc})
 assert.equal(proof.replacementTxid,B);assert.deepEqual(proof.evidence.sharedInputs,[`${C}:0`])
})

test('unrelated visible transaction cannot be called a replacement',async()=>{
 const rpc=async(method,params)=>{const id=params?.[0];if(method==='gettransaction')return notFound();if(method==='getrawtransaction'){if(id===A)return {txid:A,confirmations:0,vin:[{txid:C,vout:0}]};if(id===B)return {txid:B,confirmations:0,vin:[{txid:'d'.repeat(64),vout:1}]};return notFound()}if(method==='getmempoolentry'){if(id===B)return {vsize:180};return notFound()}}
 await assert.rejects(()=>verifyBitcoinIncidentResolution({incident,payout,resolutionCode:'TX_REPLACED',replacementTxid:B,rpc}),/INPUT_MISMATCH/)
})

test('arbitrary resolution code is forbidden',async()=>{
 await assert.rejects(()=>verifyBitcoinIncidentResolution({incident,payout,resolutionCode:'MANUAL_REVIEW_COMPLETE',rpc:async()=>null}),/UNSUPPORTED/)
})
