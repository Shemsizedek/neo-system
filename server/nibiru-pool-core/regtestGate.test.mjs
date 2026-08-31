import test from 'node:test'
import assert from 'node:assert/strict'
import {runRegtestGate} from './regtestGate.mjs'

function rpcFixture({chain='regtest'}={}){
  let blocks=101
  return async(method,params=[])=>{
    if(method==='getblockchaininfo')return {chain,blocks,headers:blocks,bestblockhash:'11'.repeat(32),initialblockdownload:false}
    if(method==='getnetworkinfo')return {version:280000,networkactive:true}
    if(method==='getblocktemplate')return {height:blocks+1,previousblockhash:'11'.repeat(32),target:'7f'.padEnd(64,'f'),coinbasevalue:5000000000,bits:'207fffff',version:536870912,curtime:1700000000,mintime:1699999999,transactions:[]}
    if(method==='getnewaddress')return 'bcrt1qreferenceaddress'
    if(method==='generatetoaddress'){
      const count=Number(params[0]);blocks+=count
      return Array.from({length:count},(_,i)=>(i+1).toString(16).padStart(64,'0'))
    }
    throw new Error(`UNEXPECTED_RPC:${method}`)
  }
}

test('regtest gate rejects non-regtest Bitcoin Core',async()=>{
  await assert.rejects(()=>runRegtestGate({rpc:rpcFixture({chain:'main'}),generateBlocks:0}),/REGTEST_REQUIRED:main/)
})

test('regtest gate verifies readiness without generating blocks',async()=>{
  const result=await runRegtestGate({rpc:rpcFixture(),generateBlocks:0})
  assert.equal(result.ok,true)
  assert.equal(result.chain,'regtest')
  assert.equal(result.blocksBefore,101)
  assert.equal(result.templateHeight,102)
  assert.deepEqual(result.generated,[])
})

test('regtest gate can generate controlled blocks through Bitcoin Core',async()=>{
  const result=await runRegtestGate({rpc:rpcFixture(),generateBlocks:2})
  assert.equal(result.generated.length,2)
  assert.equal(result.blocksBefore,101)
  assert.equal(result.blocksAfter,103)
  assert.match(result.bestBlockHash,/^[0-9a-f]{64}$/)
})
