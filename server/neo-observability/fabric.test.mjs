import test from 'node:test'
import assert from 'node:assert/strict'
import {telemetrySample,buildServiceSlo,calculateCapacity,classifyAlert,buildObservabilityState,createNocSnapshot} from './fabric.mjs'

test('capacity thresholds classify saturation',()=>{assert.equal(calculateCapacity({used:91,total:100}).state,'CRITICAL')})
test('slo produces burn-rate alert',()=>{const s=buildServiceSlo({service:'api',good:970,total:1000,target:.999});assert.equal(classifyAlert({slo:s}), 'CRITICAL')})
test('observability correlates service telemetry into NOC state',()=>{
 const samples=[telemetrySample({service:'db',metrics:{availability:.9},dependencies:[]}),telemetrySample({service:'api',metrics:{availability:.95},dependencies:['db']})]
 const slos=[buildServiceSlo({service:'db',good:999,total:1000}),buildServiceSlo({service:'api',good:999,total:1000})]
 const state=buildObservabilityState({samples,slos,thresholds:{availability:{min:.99,severity:'high'}}})
 assert.equal(state.gate,119);assert.equal(createNocSnapshot({state}).estate,'Global Vast Estate')
})
