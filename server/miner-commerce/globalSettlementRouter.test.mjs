import test from 'node:test'
import assert from 'node:assert/strict'
import {routeSettlement,failoverRoute,reconcileSettlement} from './globalSettlementRouter.mjs'

test('routes to compliant preferred rail and provides fallbacks',()=>{
 const rails=[
  {id:'A',enabled:true,status:'READY',currencies:['USD'],jurisdictions:['US'],complianceApproved:true,liquidityScore:4,speed:'HOURS',feeBps:50},
  {id:'B',enabled:true,status:'READY',currencies:['USD'],jurisdictions:['US'],complianceApproved:true,liquidityScore:5,speed:'MINUTES',feeBps:20}
 ]
 const r=routeSettlement({currency:'USD',jurisdiction:'US',preferredRail:'A'},rails)
 assert.equal(r.status,'ROUTED')
 assert.equal(r.primary.id,'A')
 const f=failoverRoute(r,'A')
 assert.equal(f.primary.id,'B')
})

test('reconciliation requires reference, currency, amount and final state',()=>{
 const r=reconcileSettlement({amount:100,currency:'CES',reference:'ORD-1',tolerance:0},{amount:100,currency:'CES',reference:'ORD-1',status:'POSTED'})
 assert.equal(r.matched,true)
})
