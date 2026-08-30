import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {NibiruPoolStore} from './persistence.mjs'
import {createWorldMintDaemon} from './daemon.mjs'

const payout='0014'+'00'.repeat(20)
const blockHash='ab'.repeat(32)

function confirmedRpc(method,params){
  if(method==='getblockheader'){
    assert.equal(params[0],blockHash)
    return Promise.resolve({hash:blockHash,confirmations:2})
  }
  throw new Error(`UNEXPECTED_RPC_${method}`)
}

test('daemon recovers a persisted candidate and books confirmed production once',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'nibiru-recovery-'))
  const dbPath=join(dir,'neo.sqlite')
  const seed=new NibiruPoolStore(dbPath)
  seed.saveBlockCandidate({
    submissionId:'candidate-1',
    jobId:'job-before-restart',
    hash:blockHash,
    height:900001,
    coinbaseValueSats:312500000,
    state:'SUBMITTED',
    bookableBtc:false,
    updatedAt:new Date().toISOString()
  })
  seed.close()

  const daemon=createWorldMintDaemon({rpc:confirmedRpc,payoutScriptHex:payout,credentialResolver:()=>null,dbPath})
  try{
    const recovered=daemon.recoverPendingCandidates()
    assert.equal(recovered.length,1)
    assert.equal(daemon.pendingCandidateCount(),1)

    const checked=await daemon.checkPendingCandidatesOnce()
    assert.equal(checked[0].state,'CONFIRMED')
    assert.equal(checked[0].bookableBtc,true)
    assert.equal(daemon.pendingCandidateCount(),0)

    await daemon.checkPendingCandidatesOnce()
    const inspect=new NibiruPoolStore(dbPath)
    try{
      const candidates=inspect.listBlockCandidates()
      const production=inspect.store.list('nibiru_production')
      assert.equal(candidates.length,1)
      assert.equal(candidates[0].state,'CONFIRMED')
      assert.equal(production.length,1)
      assert.equal(production[0].blockHash,blockHash)
      assert.equal(production[0].bookableBtc,true)
    }finally{
      inspect.close()
    }
  }finally{
    rmSync(dir,{recursive:true,force:true})
  }
})

test('recovery never rebroadcasts or books an unknown candidate',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'nibiru-recovery-'))
  const dbPath=join(dir,'neo.sqlite')
  const seed=new NibiruPoolStore(dbPath)
  seed.saveBlockCandidate({submissionId:'candidate-2',jobId:'old-job',hash:blockHash,height:900002,coinbaseValueSats:312500000,state:'SUBMITTED',bookableBtc:false})
  seed.close()

  const calls=[]
  const rpc=async(method)=>{
    calls.push(method)
    if(method==='getblockheader')throw new Error('Block not found')
    throw new Error(`UNEXPECTED_RPC_${method}`)
  }
  const daemon=createWorldMintDaemon({rpc,payoutScriptHex:payout,credentialResolver:()=>null,dbPath})
  try{
    daemon.recoverPendingCandidates()
    const checked=await daemon.checkPendingCandidatesOnce()
    assert.equal(checked[0].state,'SUBMITTED')
    assert.deepEqual(calls,['getblockheader'])
    const inspect=new NibiruPoolStore(dbPath)
    try{assert.equal(inspect.store.list('nibiru_production').length,0)}finally{inspect.close()}
  }finally{
    rmSync(dir,{recursive:true,force:true})
  }
})
