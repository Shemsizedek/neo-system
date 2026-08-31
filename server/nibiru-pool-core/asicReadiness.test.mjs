import test from 'node:test'
import assert from 'node:assert/strict'
import {assessAsicReadiness} from './asicReadiness.mjs'

const config={payoutScriptHex:'0014'+'11'.repeat(20),stratumHost:'127.0.0.1'}
const network={networkactive:true}
const chain={chain:'main',initialblockdownload:false,blocks:900000,headers:900000,bestblockhash:'aa'.repeat(32)}
const template={height:900001,previousblockhash:'aa'.repeat(32),bits:'170fffff'}

test('ASIC readiness is green only when every mainnet gate is explicit',()=>{
  const env={NIBIRU_ASIC_WORKER_ID:'asic-01',NIBIRU_MAINNET_MINING_ACK:'true'}
  const report=assessAsicReadiness({config,network,chain,template,env})
  assert.equal(report.ready,true)
  assert.equal(report.checks.every(c=>c.ok),true)
})

test('ASIC readiness refuses non-mainnet chain',()=>{
  const env={NIBIRU_ASIC_WORKER_ID:'asic-01',NIBIRU_MAINNET_MINING_ACK:'true'}
  const report=assessAsicReadiness({config,network,chain:{...chain,chain:'regtest'},template,env})
  assert.equal(report.ready,false)
  assert.equal(report.checks.find(c=>c.id==='BITCOIN_MAINNET').ok,false)
})

test('external Stratum bind requires explicit approval',()=>{
  const env={NIBIRU_ASIC_WORKER_ID:'asic-01',NIBIRU_MAINNET_MINING_ACK:'true'}
  const report=assessAsicReadiness({config:{...config,stratumHost:'0.0.0.0'},network,chain,template,env})
  assert.equal(report.ready,false)
  assert.equal(report.checks.find(c=>c.id==='STRATUM_EXPOSURE_APPROVED').ok,false)
})

test('external Stratum bind can be explicitly approved',()=>{
  const env={NIBIRU_ASIC_WORKER_ID:'asic-01',NIBIRU_MAINNET_MINING_ACK:'true',NIBIRU_ALLOW_EXTERNAL_STRATUM:'true'}
  const report=assessAsicReadiness({config:{...config,stratumHost:'0.0.0.0'},network,chain,template,env})
  assert.equal(report.ready,true)
})

test('worker enrollment and activation acknowledgement are mandatory',()=>{
  const report=assessAsicReadiness({config,network,chain,template,env:{}})
  assert.equal(report.ready,false)
  assert.equal(report.checks.find(c=>c.id==='ASIC_WORKER_ENROLLED').ok,false)
  assert.equal(report.checks.find(c=>c.id==='MAINNET_ACTIVATION_ACK').ok,false)
})
