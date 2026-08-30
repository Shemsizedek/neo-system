import test from 'node:test'
import assert from 'node:assert/strict'
import {createGenesisPoolRuntime} from './genesisRuntime.mjs'
import {createStratumGateway} from './gatewayCore.mjs'
import {createWorkerCredential} from './workerAuth.mjs'
import {assembleStratumHeader,findReferenceShare,createReferenceMinerClient} from './referenceMiner.mjs'

const payoutScript='76a914000000000000000000000000000000000000000088ac'

function fakeRpc(){
  return async method=>{
    if(method==='getblocktemplate')return {
      previousblockhash:'11'.repeat(32),
      bits:'207fffff',
      height:101,
      version:0x20000000,
      curtime:Math.floor(Date.now()/1000),
      mintime:Math.floor(Date.now()/1000)-1,
      coinbasevalue:5000000000,
      transactions:[]
    }
    if(method==='submitblock')return null
    throw new Error(`UNEXPECTED_RPC_${method}`)
  }
}

test('reference miner reconstructs deterministic header from Stratum notify',async()=>{
  const runtime=createGenesisPoolRuntime({rpc:fakeRpc(),payoutScriptHex:payoutScript,initialDifficulty:'0.000000001'})
  await runtime.refreshTemplate()
  const extranonce1='01020304'
  const notify=runtime.notifyMessage({extranonce1})
  const first=assembleStratumHeader({notify,extranonce1,extranonce2:'00000000',nonce:'00000000'})
  const second=assembleStratumHeader({notify,extranonce1,extranonce2:'00000000',nonce:'00000000'})
  assert.equal(first.headerHex,second.headerHex)
  assert.equal(first.hash,second.hash)
  assert.equal(first.previousBlockHash,'11'.repeat(32))
  assert.match(first.coinbaseTxid,/^[0-9a-f]{64}$/)
})

test('reference miner finds a controlled low-difficulty share',async()=>{
  const runtime=createGenesisPoolRuntime({rpc:fakeRpc(),payoutScriptHex:payoutScript,initialDifficulty:'0.000000001'})
  await runtime.refreshTemplate()
  const notify=runtime.notifyMessage({extranonce1:'a1b2c3d4'})
  const share=findReferenceShare({notify,extranonce1:'a1b2c3d4',extranonce2:'00000000',difficulty:'0.000000001',maxNonce:10})
  assert.match(share.nonce,/^[0-9a-f]{8}$/)
  assert.match(share.headerHex,/^[0-9a-f]{160}$/)
})

test('reference miner completes subscribe authorize reconstruct and submit against gateway',async()=>{
  const poolId='world-mint-reference-test'
  const workerId='worker.reference'
  const secret='0123456789abcdef0123456789abcdef'
  const credential=createWorkerCredential({poolId,workerId,memberId:'member-reference',secret})
  const runtime=createGenesisPoolRuntime({rpc:fakeRpc(),payoutScriptHex:payoutScript,poolId,initialDifficulty:'0.000000001'})
  await runtime.refreshTemplate()
  const current=runtime.currentJob()
  const job={jobId:current.runtimeJobId,templateId:current.template.templateId,difficulty:runtime.currentDifficulty(),bits:current.template.bits,stale:false}
  const recorded=[]
  const gateway=createStratumGateway({
    host:'127.0.0.1',port:0,poolId,
    credentialResolver:async id=>id===workerId?credential:null,
    jobResolver:async id=>id===job.jobId?job:null,
    shareRecorder:async share=>recorded.push(share),
    notifyResolver:({extranonce1})=>runtime.notifyMessage({extranonce1}),
    difficultyResolver:()=>runtime.difficultyUpdate(),
    shareVerifier:async({extranonce1,extranonce2,ntime,nonce,raw})=>{
      const result=runtime.verifyWorkerSolution({extranonce1,extranonce2,ntime,nonce})
      return {...raw,accepted:result.submission.accepted,blockCandidate:result.submission.blockCandidate,computedHash:result.submission.hash,hash:result.submission.hash}
    },
    shutdownGraceMs:100
  })
  await gateway.start()
  const port=gateway.server.address().port
  try{
    const result=await createReferenceMinerClient({host:'127.0.0.1',port,workerId,secret,maxNonce:10})
    assert.equal(result.ok,true)
    assert.equal(recorded.length,1)
    assert.equal(recorded[0].accepted,true)
    assert.equal(recorded[0].computedHash,result.share.hash)
    assert.equal(recorded[0].extranonce2,result.share.extranonce2)
  }finally{
    await gateway.stop()
  }
})
