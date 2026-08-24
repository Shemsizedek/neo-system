import test from 'node:test'
import assert from 'node:assert/strict'
import {createAdapter} from './index.mjs'
import {evaluateHealth,safeControl} from '../health.mjs'

test('adapter factory falls back to reference adapter',async()=>{
  const adapter=createAdapter({referenceTelemetry:{hashrateTh:100,powerW:3000,temperatureC:65}})
  const telemetry=await adapter.readTelemetry()
  assert.equal(telemetry.hashrateTh,100)
  assert.equal(telemetry.source,'REFERENCE_ADAPTER')
})

test('health evaluator flags hot low-hashrate telemetry',()=>{
  const result=evaluateHealth({hashrateTh:0,powerW:3000,temperatureC:91,acceptedShares:100,rejectedShares:10})
  assert.equal(result.status,'DEGRADED')
  assert.ok(result.issues.includes('HIGH_TEMPERATURE'))
  assert.ok(result.issues.includes('LOW_HASHRATE'))
  assert.ok(result.issues.includes('HIGH_REJECT_RATE'))
})

test('safe control only invokes supported command',async()=>{
  let restarted=false
  const adapter={async restart(){restarted=true;return {ok:true}}}
  const result=await safeControl(adapter,'RESTART')
  assert.equal(result.ok,true)
  assert.equal(restarted,true)
  await assert.rejects(()=>safeControl(adapter,'CHANGE_POOL'),/Unsupported control command/)
})
