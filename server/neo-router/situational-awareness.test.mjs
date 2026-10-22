import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {normalizeSignal,correlateSituation,scoreAttention,buildSituationalState} from './situational-awareness.mjs'

const policy=JSON.parse(fs.readFileSync('architecture/neo-situational-awareness-policy.json','utf8'))
const now='2026-10-22T16:40:00Z'

test('cross-source signals correlate into one situation',()=>{
  const signals=[
    {id:'1',source:'gate-103',type:'runtime.failure',service:'neo-bank',severity:'critical',timestamp:now},
    {id:'2',source:'gate-104',type:'recovery.failed',service:'neo-bank',severity:'high',timestamp:now}
  ]
  const out=correlateSituation(signals,{now:Date.parse(now)})
  assert.equal(out.length,1)
  assert.equal(out[0].cross_source,true)
})

test('attention favors critical cross-source high-blast situations',()=>{
  const low={severity:'low',cross_source:false,blast_radius:1,recurrence:1,confidence:1}
  const high={severity:'critical',cross_source:true,blast_radius:4,recurrence:3,confidence:1}
  assert.ok(scoreAttention(high,policy)>scoreAttention(low,policy))
})

test('telemetry absence is unknown, never healthy',()=>{
  const state=buildSituationalState({signals:[],telemetry:[],policy,now})
  assert.equal(state.state,'UNKNOWN')
})

test('dependency impact can increase situational context without claiming proof',()=>{
  const signals=[{id:'1',source:'gate-103',type:'runtime.failure',service:'db',severity:'critical',timestamp:now}]
  const telemetry=[
    {service:'neo-bank',timestamp:now,metrics:{},logs:[],traces:[],dependencies:['db']},
    {service:'neo-counter',timestamp:now,metrics:{},logs:[],traces:[],dependencies:['db']}
  ]
  const state=buildSituationalState({signals,telemetry,policy,now})
  assert.equal(state.situations[0].inferred_root_cause,true)
  assert.deepEqual(state.situations[0].dependents.sort(),['neo-bank','neo-counter'])
  assert.match(state.interpretation_note,/not proven causation/)
})

test('normalization preserves confidence as an explicit field',()=>{
  const s=normalizeSignal({source:'x',type:'y',confidence:0.8,timestamp:now})
  assert.equal(s.confidence,0.8)
})
