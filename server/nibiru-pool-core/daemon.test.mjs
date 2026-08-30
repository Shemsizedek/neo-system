import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createWorldMintDaemon} from './daemon.mjs'

const prev='11'.repeat(32)
const target='00000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
const payout='0014'+'00'.repeat(20)

function rpc(method){
  if(method==='getblocktemplate')return Promise.resolve({
    previousblockhash:prev,
    bits:'1d00ffff',
    target,
    height:900000,
    version:536870912,
    curtime:1800000000,
    mintime:1799999999,
    coinbasevalue:312500000,
    transactions:[],
    mutable:['time','transactions','prevblock'],
    rules:['segwit']
  })
  if(method==='getblockchaininfo')return Promise.resolve({blocks:899999,bestblockhash:prev})
  throw new Error(`UNEXPECTED_RPC_${method}`)
}

test('daemon refuses to initialize without required trust boundaries',()=>{
  assert.throws(()=>createWorldMintDaemon({rpc:null,payoutScriptHex:payout,credentialResolver:()=>null}),/BITCOIN_RPC_CLIENT_REQUIRED/)
  assert.throws(()=>createWorldMintDaemon({rpc,payoutScriptHex:payout}),/CREDENTIAL_RESOLVER_REQUIRED/)
})

test('daemon refreshes a Bitcoin Core template into a current World Mint job',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'nibiru-daemon-'))
  const dbPath=join(dir,'neo.sqlite')
  const daemon=createWorldMintDaemon({rpc,payoutScriptHex:payout,credentialResolver:()=>null,dbPath})
  try{
    const job=await daemon.refreshTemplate()
    assert.equal(job.poolId,'world-mint-genesis')
    assert.equal(job.height,900000)
    assert.equal(job.previousBlockHash,prev)
    assert.equal(job.stale,false)
    assert.ok(job.jobId.startsWith('wm_'))
    assert.ok(Number(daemon.currentDifficulty())>0)
  }finally{
    await daemon.stop()
    rmSync(dir,{recursive:true,force:true})
  }
})
