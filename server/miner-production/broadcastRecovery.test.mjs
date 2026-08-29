import test from 'node:test'
import assert from 'node:assert/strict'
import {deterministicTxid,createBroadcastIntent,executeBroadcastIntent,recoverPreparedBroadcasts} from './broadcastRecovery.mjs'

const raw='0100000000010000000000000000000000000000000000000000000000000000000000000000ffffffff00ffffffff0100000000000000000000000000'
const finalized={complete:true,payoutId:'PAY-1',psbtId:'PSBT-1',hex:raw}

test('derives stable txid and prepares durable intent before broadcast',()=>{
  const a=deterministicTxid(raw),b=deterministicTxid(raw)
  assert.equal(a,b);assert.match(a,/^[0-9a-f]{64}$/)
  const intent=createBroadcastIntent({finalized})
  assert.equal(intent.txid,a);assert.equal(intent.state,'PREPARED');assert.equal(intent.rawHex,raw)
})

test('broadcast verifies Bitcoin Core returned the precomputed txid',async()=>{
  const intent=createBroadcastIntent({finalized})
  const calls=[]
  const rpc=async(method)=>{calls.push(method);if(method==='getmempoolentry'||method==='getrawtransaction')throw new Error('not found');if(method==='sendrawtransaction')return intent.txid}
  const result=await executeBroadcastIntent({intent,rpc})
  assert.equal(result.state,'BROADCAST');assert.equal(result.txid,intent.txid);assert.equal(calls.at(-1),'sendrawtransaction')
})

test('recovery finds prepared tx in mempool and does not rebroadcast',async()=>{
  const intent=createBroadcastIntent({finalized})
  const calls=[]
  const rpc=async(method)=>{calls.push(method);if(method==='getmempoolentry')return {vsize:100};throw new Error('unexpected')}
  const result=await executeBroadcastIntent({intent,rpc})
  assert.equal(result.recoveryLocation,'MEMPOOL');assert.equal(calls.includes('sendrawtransaction'),false)
})

test('startup recovery reports absent prepared transaction without broadcasting it',async()=>{
  const intent=createBroadcastIntent({finalized})
  const rpc=async()=>{throw new Error('not found')}
  const results=await recoverPreparedBroadcasts({intents:[intent],rpc})
  assert.equal(results.length,1);assert.equal(results[0].located.found,false)
})
