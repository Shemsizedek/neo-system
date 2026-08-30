import test from 'node:test'
import assert from 'node:assert/strict'
import {createNibiruPool,registerWorker,markPoolReady,activatePool,recordShare,POOL_STATES} from './poolCore.mjs'

test('pool requires Bitcoin RPC, Stratum, and a worker before readiness',()=>{
  let pool=createNibiruPool({name:'World Mint Genesis Pool',operatorMemberId:'world-mint',payoutAddress:'btc-test-address'})
  assert.throws(()=>markPoolReady(pool,{bitcoinRpcConfigured:true,stratumConfigured:true}),/WORKER_REQUIRED/)
  pool=registerWorker(pool,{memberId:'world-mint',label:'genesis-worker'})
  assert.throws(()=>markPoolReady(pool,{bitcoinRpcConfigured:false,stratumConfigured:true}),/BITCOIN_RPC_REQUIRED/)
  assert.throws(()=>markPoolReady(pool,{bitcoinRpcConfigured:true,stratumConfigured:false}),/STRATUM_REQUIRED/)
  pool=markPoolReady(pool,{bitcoinRpcConfigured:true,stratumConfigured:true})
  assert.equal(pool.state,POOL_STATES.READY)
})

test('active pool records accepted and rejected shares independently',()=>{
  let pool=createNibiruPool({name:'World Mint Genesis Pool',operatorMemberId:'world-mint',payoutAddress:'btc-test-address'})
  pool=registerWorker(pool,{workerId:'wm-01',memberId:'world-mint'})
  pool=activatePool(markPoolReady(pool,{bitcoinRpcConfigured:true,stratumConfigured:true}))
  ;({pool}=recordShare(pool,{workerId:'wm-01',difficulty:1024,accepted:true,jobId:'job-1'}))
  ;({pool}=recordShare(pool,{workerId:'wm-01',difficulty:1024,accepted:false,jobId:'job-1'}))
  assert.equal(pool.accounting.acceptedShares,'1')
  assert.equal(pool.accounting.rejectedShares,'1')
})

test('pool cannot activate without readiness gate',()=>{
  const pool=createNibiruPool({name:'Member Pool',operatorMemberId:'member-1',payoutAddress:'btc-test-address'})
  assert.throws(()=>activatePool(pool),/POOL_NOT_READY/)
})
