import test from 'node:test'
import assert from 'node:assert/strict'
import {loadTargets,probeTarget,buildRuntimeReport} from './neo-runtime-truth.mjs'

test('Gate 103 target registry is explicit and production-safe',()=>{
  const config=loadTargets()
  assert.equal(config.gate,103)
  assert.ok(config.targets.length>=8)
  assert.ok(config.targets.every(t=>t.url.startsWith('https://')))
  assert.ok(config.autopilot.requires_separate_authority.includes('redeploy_service'))
})

test('healthy probe requires expected HTTP and declared JSON health',async()=>{
  const fetchImpl=async()=>new Response(JSON.stringify({ok:true}),{status:200,headers:{'content-type':'application/json'}})
  const result=await probeTarget({system_id:'T',url:'https://example.test/health',expected_http:[200],expect_json_ok:true},{fetchImpl,retries:1,retryDelayMs:0})
  assert.equal(result.runtime_state,'LIVE_HEALTHY')
})

test('HTTP success without required health payload is unhealthy',async()=>{
  const fetchImpl=async()=>new Response(JSON.stringify({ok:false}),{status:200,headers:{'content-type':'application/json'}})
  const result=await probeTarget({system_id:'T',url:'https://example.test/health',expected_http:[200],expect_json_ok:true},{fetchImpl,retries:1,retryDelayMs:0})
  assert.equal(result.runtime_state,'LIVE_UNHEALTHY')
})

test('runtime report never upgrades health probes to production validation',async()=>{
  const config={autopilot:{retry_count:1,retry_delay_ms:0},targets:[{system_id:'T',url:'https://example.test/health',expected_http:[200],expect_json_ok:true,critical:true}]}
  const fetchImpl=async()=>new Response(JSON.stringify({ok:true}),{status:200,headers:{'content-type':'application/json'}})
  const report=await buildRuntimeReport(config,{fetchImpl})
  assert.equal(report.production_validated,false)
  assert.equal(report.summary.critical_failures.length,0)
})
