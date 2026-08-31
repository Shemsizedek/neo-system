import test from 'node:test'
import assert from 'node:assert/strict'
import {runRegtestPoolSolve} from './regtestPoolSolve.mjs'

const payoutScript='76a914000000000000000000000000000000000000000088ac'

function regtestRpc({chain='regtest',submitResult=null,confirmations=1}={}){
  const calls=[]
  const rpc=async(method,params=[])=>{
    calls.push({method,params})
    if(method==='getblockchaininfo')return {chain,blocks:100,headers:100,bestblockhash:'11'.repeat(32),initialblockdownload:false}
    if(method==='getblocktemplate')return {
      previousblockhash:'11'.repeat(32),
      bits:'207fffff',
      target:'ff'.repeat(32),
      height:101,
      version:0x20000000,
      curtime:1700000000,
      mintime:1699999999,
      coinbasevalue:5000000000,
      transactions:[]
    }
    if(method==='submitblock')return submitResult
    if(method==='getblockheader')return {hash:params[0],confirmations,height:101}
    throw new Error(`UNEXPECTED_RPC_${method}`)
  }
  return {rpc,calls}
}

test('pool-owned regtest solver builds submits and confirms its own block candidate',async()=>{
  const {rpc,calls}=regtestRpc()
  const result=await runRegtestPoolSolve({rpc,payoutScriptHex:payoutScript,maxNonce:0})
  assert.equal(result.ok,true)
  assert.equal(result.chain,'regtest')
  assert.equal(result.submitAccepted,true)
  assert.equal(result.confirmations,1)
  assert.equal(result.bookableTestBtc,true)
  assert.match(result.blockHash,/^[0-9a-f]{64}$/)
  assert.ok(calls.some(call=>call.method==='submitblock'))
  assert.ok(calls.some(call=>call.method==='getblockheader'&&call.params[0]===result.blockHash))
})

test('pool-owned regtest solver refuses non-regtest networks before template or submission',async()=>{
  const {rpc,calls}=regtestRpc({chain:'main'})
  await assert.rejects(()=>runRegtestPoolSolve({rpc,payoutScriptHex:payoutScript,maxNonce:0}),/REGTEST_REQUIRED:main/)
  assert.deepEqual(calls.map(call=>call.method),['getblockchaininfo'])
})

test('pool-owned regtest solver never books a submitblock rejection',async()=>{
  const {rpc,calls}=regtestRpc({submitResult:'high-hash'})
  await assert.rejects(()=>runRegtestPoolSolve({rpc,payoutScriptHex:payoutScript,maxNonce:0}),/REGTEST_SUBMITBLOCK_REJECTED:high-hash/)
  assert.equal(calls.some(call=>call.method==='getblockheader'),false)
})

test('pool-owned regtest solver requires Bitcoin Core confirmation after accepted submitblock',async()=>{
  const {rpc}=regtestRpc({confirmations:0})
  await assert.rejects(()=>runRegtestPoolSolve({rpc,payoutScriptHex:payoutScript,maxNonce:0}),/REGTEST_BLOCK_NOT_CONFIRMED/)
})
