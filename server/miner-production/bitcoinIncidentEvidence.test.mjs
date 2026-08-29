import test from 'node:test'
import assert from 'node:assert/strict'
import {verifyBitcoinIncidentResolution} from './bitcoinIncidentEvidence.mjs'
const A='a'.repeat(64),B='b'.repeat(64)
const incident={id:'INC-1',payoutId:'P-1'}, payout={id:'P-1',txid:A}

test('confirmed resolution requires chain confirmation',async()=>{
 const rpc=async(method)=>method==='getrawtransaction'?{txid:A,confirmations:2,blockhash:'block'}:null
 const proof=await verifyBitcoinIncidentResolution({incident,payout,resolutionCode:'TX_CONFIRMED',rpc})
 assert.equal(proof.verified,true);assert.equal(proof.evidence.chain.confirmations,2)
})

test('caller cannot claim confirmation without Bitcoin Core evidence',async()=>{
 const rpc=async()=>{throw new Error('BITCOIN_RPC_-5:No such mempool or blockchain transaction')}
 await assert.rejects(()=>verifyBitcoinIncidentResolution({incident,payout,resolutionCode:'TX_CONFIRMED',rpc}),/TX_NOT_CONFIRMED/)
})

test('not-broadcast requires absence from both chain and mempool',async()=>{
 const rpc=async()=>{throw new Error('BITCOIN_RPC_-5:No such mempool or blockchain transaction')}
 const proof=await verifyBitcoinIncidentResolution({incident,payout,resolutionCode:'TX_NOT_BROADCAST',rpc})
 assert.equal(proof.evidence.chain.found,false);assert.equal(proof.evidence.mempool.found,false)
})

test('not-broadcast is rejected if transaction exists in mempool',async()=>{
 const rpc=async(method)=>{if(method==='getrawtransaction')throw new Error('BITCOIN_RPC_-5:No such mempool or blockchain transaction');if(method==='getmempoolentry')return {vsize:200}}
 await assert.rejects(()=>verifyBitcoinIncidentResolution({incident,payout,resolutionCode:'TX_NOT_BROADCAST',rpc}),/TRANSACTION_PRESENT/)
})

test('replacement must itself be visible to Bitcoin Core',async()=>{
 const rpc=async(method,params)=>{const id=params[0];if(method==='getrawtransaction'){if(id===B)return {txid:B,confirmations:0};throw new Error('BITCOIN_RPC_-5:No such mempool or blockchain transaction')}if(method==='getmempoolentry'){if(id===B)return {vsize:180};throw new Error('BITCOIN_RPC_-5:Transaction not in mempool')}}
 const proof=await verifyBitcoinIncidentResolution({incident,payout,resolutionCode:'TX_REPLACED',replacementTxid:B,rpc})
 assert.equal(proof.replacementTxid,B)
})

test('arbitrary resolution code is forbidden',async()=>{
 await assert.rejects(()=>verifyBitcoinIncidentResolution({incident,payout,resolutionCode:'MANUAL_REVIEW_COMPLETE',rpc:async()=>null}),/UNSUPPORTED/)
})
