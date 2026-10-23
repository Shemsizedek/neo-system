import test from 'node:test'
import assert from 'node:assert/strict'
import {createCostModel,estimateWorkloadCost,createLicenseEntitlement,authorizeEntitlement,allocateCapacity,createChargebackEntry,economicSnapshot} from './fabric.mjs'

test('scheduler computes internal workload economics',()=>{
 const c=createCostModel({cpu_core_hour:2,memory_gb_hour:1,power_kwh:.5})
 const x=estimateWorkloadCost({requirements:{cpu_cores:2,memory_mb:2048},durationHours:3,powerKwh:2,costModel:c})
 assert.equal(x.total,19)
})
test('tokenized license grants only encoded internal entitlement',()=>{
 const l=createLicenseEntitlement({license_id:'L1',holder:'A',license_class:'XCPC',quota:{CPU_CORE_HOUR:8}})
 assert.equal(authorizeEntitlement({license:l,resource:'CPU_CORE_HOUR',amount:4}).authorized,true)
 assert.equal(authorizeEntitlement({license:l,resource:'CPU_CORE_HOUR',amount:9}).authorized,false)
})
test('capacity allocation respects healthy attested nodes',()=>{
 const l=createLicenseEntitlement({license_id:'L1',holder:'A',license_class:'SERVICE_LICENSE',quota:{CPU_CORE_HOUR:8}})
 const out=allocateCapacity({workloads:[{workload_id:'w',holder:'A',license_id:'L1',priority_weight:300,requirements:{cpu_cores:2,memory_mb:1024,storage_gb:5}}],nodes:[{node_id:'n',attested:true,health:'HEALTHY',capacity:{cpu_cores:4,memory_mb:4096,storage_gb:100}}],licenses:[l]})
 assert.equal(out.placements[0].status,'ALLOCATED')
})
test('chargeback remains internal ledger scope',()=>{assert.equal(createChargebackEntry({holder:'A',workloadId:'w',amount:10}).ledger_scope,'INTERNAL_ONLY')})
test('snapshot preserves external authority boundary',()=>{assert.match(economicSnapshot({}).authority_boundary,/do not establish statutory government/)})
