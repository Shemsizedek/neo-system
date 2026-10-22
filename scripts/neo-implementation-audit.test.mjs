import test from 'node:test'
import assert from 'node:assert/strict'
import {auditRegistry,loadRegistry} from './neo-implementation-audit.mjs'

test('Gate 101 registry is evidence-backed and internally consistent',()=>{
  const registry=loadRegistry()
  const report=auditRegistry(registry)
  assert.equal(report.errors.length,0,report.errors.join('\n'))
  assert.ok(report.summary.total>=10)
  assert.equal(report.summary.counts.VALIDATED>=3,true)
})

test('Gate 101 audit exposes incomplete work instead of inflating completion',()=>{
  const report=auditRegistry(loadRegistry())
  assert.ok(report.backlog.some(item=>item.status==='NOT_BUILT'))
  assert.ok(report.backlog.some(item=>item.status==='PARTIAL'))
  assert.ok(report.traces.every(item=>['PASSING','UNKNOWN','BROKEN'].includes(item.health)))
})

test('validated requirements carry test evidence',()=>{
  const registry=loadRegistry()
  for(const req of registry.requirements.filter(r=>r.status==='VALIDATED')){
    assert.ok(Array.isArray(req.tests)&&req.tests.length>0,req.requirement_id)
  }
})
