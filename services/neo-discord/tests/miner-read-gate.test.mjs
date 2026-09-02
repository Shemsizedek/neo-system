import test from 'node:test'
import assert from 'node:assert/strict'
import {evaluateMinerReadEnv} from '../deployment/miner-read-preflight.mjs'
import {runMinerReadLiveSmoke} from '../deployment/miner-read-live-smoke.mjs'

const base={
  NEO_MINER_OPERATOR_URL:'https://neo-miner-readonly-61704167834.us-central1.run.app/discord/snapshot',
  NEO_MINER_OPERATOR_TOKEN:'a'.repeat(64),
  DISCORD_OPERATOR_ROLE_IDS:'123456789012345678'
}

test('miner-only preflight accepts protected Cloud Run endpoint',()=>{
  const out=evaluateMinerReadEnv(base)
  assert.equal(out.ok,true)
  assert.deepEqual(out.configuredServices,['neo-miner'])
  assert.deepEqual(out.disabledServices,['neo-relations'])
})

test('miner-only preflight rejects malformed operator token',()=>{
  const out=evaluateMinerReadEnv({...base,NEO_MINER_OPERATOR_TOKEN:'not-a-token'})
  assert.equal(out.ok,false)
  assert.equal(out.code,'NEO_MINER_OPERATOR_TOKEN_64_HEX_REQUIRED')
})

test('miner-only preflight still requires an authorized Discord selector',()=>{
  const out=evaluateMinerReadEnv({...base,DISCORD_OPERATOR_ROLE_IDS:''})
  assert.equal(out.ok,false)
  assert.equal(out.code,'OPERATOR_SELECTOR_REQUIRED')
})

test('miner live smoke proves bootstrap is protected and non-mutating',async()=>{
  const fetchImpl=async()=>new Response(JSON.stringify({
    mode:'READ_ONLY_BOOTSTRAP',
    status:'BOOTSTRAP_NOT_LIVE',
    mutates:false,
    liveMining:false
  }),{status:200,headers:{'content-type':'application/json'}})
  const out=await runMinerReadLiveSmoke(base,{fetchImpl})
  assert.equal(out.ok,true)
  assert.equal(out.liveMining,false)
})

test('miner live smoke rejects any live-mining claim',async()=>{
  const fetchImpl=async()=>new Response(JSON.stringify({
    mode:'READ_ONLY_BOOTSTRAP',
    status:'BOOTSTRAP_NOT_LIVE',
    mutates:false,
    liveMining:true
  }),{status:200})
  await assert.rejects(()=>runMinerReadLiveSmoke(base,{fetchImpl}),/MINER_LIVE_MINING_FALSE_REQUIRED/)
})
