import test from 'node:test'
import assert from 'node:assert/strict'
import {buildCoinbase,merkleRootFromTxids,merkleBranchForCoinbase,applyMerkleBranch} from './blockPrimitives.mjs'
import {createGenesisPoolRuntime} from './genesisRuntime.mjs'

const payoutScript='76a914000000000000000000000000000000000000000088ac'

test('coinbase split reconstructs the stripped coinbase around extranonce2',()=>{
  const coinbase=buildCoinbase({height:900000,valueSats:'312500000',payoutScriptHex:payoutScript,extranonce1Hex:'aabbccdd',extranonce2Hex:'01020304',extranonce2Size:4})
  assert.equal(`${coinbase.coinbase1Hex}01020304${coinbase.coinbase2Hex}`,coinbase.strippedHex)
  assert.match(coinbase.txid,/^[0-9a-f]{64}$/)
})

test('coinbase merkle branch resolves to the same root as the full txid tree',()=>{
  const coinbaseTxid='11'.repeat(32)
  const txids=['22'.repeat(32),'33'.repeat(32),'44'.repeat(32)]
  const root=merkleRootFromTxids([coinbaseTxid,...txids])
  const branch=merkleBranchForCoinbase(txids)
  assert.equal(applyMerkleBranch(coinbaseTxid,branch),root)
})

test('genesis runtime emits set_difficulty and Stratum mining.notify from Bitcoin Core template data',async()=>{
  const calls=[]
  const rpc=async(method,params)=>{
    calls.push({method,params})
    if(method==='getblocktemplate')return {
      previousblockhash:'00'.repeat(32),
      bits:'1d00ffff',
      target:'ff'.repeat(32),
      height:900000,
      version:0x20000000,
      curtime:Math.floor(Date.now()/1000),
      mintime:Math.floor(Date.now()/1000)-1,
      coinbasevalue:312500000,
      transactions:[]
    }
    if(method==='submitblock')return null
    throw new Error(`UNEXPECTED_RPC_${method}`)
  }
  const runtime=createGenesisPoolRuntime({rpc,payoutScriptHex:payoutScript,initialDifficulty:1024})
  const job=await runtime.refreshTemplate()
  assert.equal(job.template.height,900000)
  const diff=runtime.difficultyUpdate()
  assert.equal(diff.method,'mining.set_difficulty')
  assert.equal(diff.params[0],1024)
  const notify=runtime.notifyMessage()
  assert.equal(notify.method,'mining.notify')
  assert.equal(notify.params[0],job.runtimeJobId)
  assert.equal(notify.params[4].length,0)
  assert.equal(calls[0].method,'getblocktemplate')
})

test('genesis runtime serializes and submits only a verified network-target candidate',async()=>{
  const rpc=async method=>{
    if(method==='getblocktemplate')return {
      previousblockhash:'00'.repeat(32),bits:'1d00ffff',target:'ff'.repeat(32),height:900000,version:0x20000000,
      curtime:Math.floor(Date.now()/1000),mintime:Math.floor(Date.now()/1000)-1,coinbasevalue:312500000,transactions:[]
    }
    if(method==='submitblock')return null
    throw new Error(`UNEXPECTED_RPC_${method}`)
  }
  const runtime=createGenesisPoolRuntime({rpc,payoutScriptHex:payoutScript,initialDifficulty:1})
  await runtime.refreshTemplate()
  const ntime=Math.floor(Date.now()/1000).toString(16).padStart(8,'0')
  const solution=runtime.verifyWorkerSolution({extranonce2:'00000001',ntime,nonce:'00000000'})
  assert.equal(solution.submission.verified,true)
  assert.equal(solution.submission.blockCandidate,true)
  const submitted=await runtime.submitIfBlockCandidate(solution)
  assert.equal(submitted.accepted,true)
  assert.equal(submitted.bookableBtc,false)
})
