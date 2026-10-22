import test from 'node:test'
import assert from 'node:assert/strict'
import {buildInventoryReport,loadInventory} from './neo-system-inventory.mjs'

test('Gate 102 inventory has unique systems and valid classifications',()=>{
  const report=buildInventoryReport(loadInventory())
  assert.equal(report.errors.length,0,report.errors.join('\n'))
  assert.ok(report.summary.systems>=10)
  assert.ok(report.systems.every(s=>['EXISTING','PARTIAL','MISSING','UNKNOWN'].includes(s.classification)))
})

test('runtime configuration is never reported as live production verification',()=>{
  const report=buildInventoryReport(loadInventory())
  for(const system of report.systems){
    assert.notEqual(system.runtime_state,'PRODUCTION_VALIDATED')
  }
})

test('inventory exposes unmapped repository components for follow-up',()=>{
  const report=buildInventoryReport(loadInventory())
  assert.ok(Array.isArray(report.unmapped_components))
})
