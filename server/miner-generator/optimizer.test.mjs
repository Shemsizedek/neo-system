import test from 'node:test'
import assert from 'node:assert/strict'
import {choosePool,optimizeHashpower,recommendOperatingMode} from './optimizer.mjs'

const miners=[
  {id:'M1',hashrateTh:120,powerW:3000,tempC:65,uptimePct:99.9,rejectedSharePct:0.2,status:'MINING'},
  {id:'M2',hashrateTh:100,powerW:3200,tempC:76,uptimePct:98,rejectedSharePct:1,status:'WARNING'},
  {id:'M3',hashrateTh:90,powerW:2900,tempC:60,uptimePct:99.5,rejectedSharePct:0.1,status:'MINING'}
]

test('optimizer preserves reserve and prioritizes contracts',()=>{
  const result=optimizeHashpower({miners,contracts:[{id:'LOW',targetHashrateTh:50,priority:1},{id:'HIGH',targetHashrateTh:150,priority:5}],reservePct:10})
  assert.equal(result.reserveTargetTh,31)
  assert.equal(result.allocations[0].contractId,'HIGH')
  assert.equal(result.allocations[0].status,'FULL')
  assert.ok(result.unallocatedUsableTh>=0)
})

test('hot miner is throttled to low power',()=>{
  assert.equal(recommendOperatingMode({...miners[0],tempC:82}),'LOW_POWER')
})

test('pool selector prefers low-fee low-latency online route',()=>{
  const pool=choosePool([
    {id:'A',enabled:true,status:'ONLINE',feePct:2,latencyMs:90,acceptedSharePct:99},
    {id:'B',enabled:true,status:'ONLINE',feePct:1,latencyMs:130,acceptedSharePct:99.5}
  ])
  assert.equal(pool.id,'B')
})
