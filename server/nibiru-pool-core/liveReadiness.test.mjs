import test from 'node:test'
import assert from 'node:assert/strict'
import {assessBitcoinCoreReadiness,runLiveReadiness} from './liveReadiness.mjs'

const hash='11'.repeat(32)
const target='00'.repeat(4)+'ff'.repeat(28)

function healthy(){
  return {
    network:{version:280000,subversion:'/Satoshi:28.0.0/',networkactive:true},
    chain:{chain:'main',blocks:900000,headers:900000,initialblockdownload:false,bestblockhash:hash},
    template:{height:900001,previousblockhash:hash,target,coinbasevalue:312500000,transactions:[]}
  }
}

test('healthy Bitcoin Core snapshot is ready',()=>{
  const result=assessBitcoinCoreReadiness(healthy())
  assert.equal(result.ready,true)
  assert.equal(result.checks.every(check=>check.ok),true)
})

test('IBD or large sync gap blocks readiness',()=>{
  const state=healthy()
  state.chain.initialblockdownload=true
  state.chain.blocks=899900
  const result=assessBitcoinCoreReadiness(state)
  assert.equal(result.ready,false)
  assert.equal(result.checks.find(check=>check.id==='INITIAL_BLOCK_DOWNLOAD_COMPLETE').ok,false)
  assert.equal(result.checks.find(check=>check.id==='CHAIN_SYNC_GAP').ok,false)
})

test('live readiness uses GBT and redacts RPC auth',async()=>{
  const state=healthy()
  const calls=[]
  const rpc=async(method)=>{
    calls.push(method)
    if(method==='getnetworkinfo')return state.network
    if(method==='getblockchaininfo')return state.chain
    if(method==='getblocktemplate')return state.template
    throw new Error('UNEXPECTED_RPC')
  }
  const env={BITCOIN_RPC_URL:'http://127.0.0.1:8332',BITCOIN_RPC_AUTH:'user:secret',WORLD_MINT_PAYOUT_SCRIPT_HEX:'0014'+'00'.repeat(20)}
  const report=await runLiveReadiness({env,rpc})
  assert.equal(report.ready,true)
  assert.equal(report.configuration.rpcAuth,'[REDACTED]')
  assert.deepEqual(calls.sort(),['getblockchaininfo','getblocktemplate','getnetworkinfo'].sort())
})
