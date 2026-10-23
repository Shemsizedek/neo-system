import test from 'node:test'
import assert from 'node:assert/strict'
import { verifyBitcoinRpcEvidence } from './bitcoin-rpc-verifier.mjs'
const txid='a'.repeat(64), blockHash='b'.repeat(64)
const evidence = {source:'crown-chain',network:'signet',txid,blockHash,confirmations:3,observedAt:new Date().toISOString(),asset:'NOMNI'}
const rpc = async (method) => ({getblockchaininfo:{chain:'signet'},getrawtransaction:{txid,blockhash:blockHash,confirmations:3},getblockheader:{hash:blockHash,confirmations:3}})[method]
test('trusted node replies verify signet block inclusion', async()=>{assert.equal((await verifyBitcoinRpcEvidence(evidence,{rpc})).verified,true)})
test('wrong network fails closed', async()=>{const result=await verifyBitcoinRpcEvidence(evidence,{rpc:async method=>method==='getblockchaininfo'?{chain:'main'}:rpc(method)});assert.equal(result.reason,'wrong_network')})
test('wrong block hash fails closed',async()=>{const result=await verifyBitcoinRpcEvidence(evidence,{rpc:async method=>method==='getrawtransaction'?{txid,blockhash:'c'.repeat(64),confirmations:3}:rpc(method)});assert.equal(result.reason,'transaction_block_mismatch')})
test('orphan block fails closed',async()=>{const result=await verifyBitcoinRpcEvidence(evidence,{rpc:async method=>method==='getblockheader'?{hash:blockHash,confirmations:-1}:rpc(method)});assert.equal(result.reason,'not_confirmed_on_active_chain')})
test('confirmation mismatches fail closed',async()=>{const result=await verifyBitcoinRpcEvidence(evidence,{rpc:async method=>method==='getrawtransaction'?{txid,blockhash:blockHash,confirmations:2}:rpc(method)});assert.equal(result.reason,'confirmation_count_mismatch')})
test('no trusted transport is rejected',async()=>{await assert.rejects(verifyBitcoinRpcEvidence(evidence),/trusted Bitcoin Core RPC required/)})
test('zero confirmations are rejected',async()=>{const result=await verifyBitcoinRpcEvidence({...evidence,confirmations:0},{rpc});assert.equal(result.reason,'confirmation_count_mismatch')})
