import test from 'node:test'
import assert from 'node:assert/strict'
import { buildOperationsCommandCenter } from './operations-command-center.mjs'

test('projects incidents, escalation, SLA and router readiness into one command view',()=>{
 const now='2026-08-24T12:00:00.000Z'
 const event={id:'e1',source:'github',type:'workflow_run.failed',receivedAt:'2026-08-24T11:58:00.000Z'}
 const routerHealth={ok:true,configured:['openai','gemini'],providers:[{id:'openai',configured:true},{id:'gemini',configured:true}],capabilities:['reasoning','frontend']}
 const view=buildOperationsCommandCenter({now,inboundEvents:[event,event],telemetry:{missions:[{id:'m1',status:'running',priority:'critical',createdAt:'2026-08-24T10:00:00.000Z',updatedAt:'2026-08-24T10:00:00.000Z'}],approvals:[{id:'a1',status:'pending'}],connectors:[]},deadLetters:[{missionId:'dead-1'}],workerFleet:[{id:'software-1',role:'software',state:'healthy'}],routerHealth})
 assert.equal(view.summary.incidents,2)
 assert.ok(view.summary.escalations>=1)
 assert.equal(view.summary.deadLetters,1)
 assert.equal(view.summary.pendingApprovals,1)
 assert.equal(view.summary.routerReady,true)
 assert.equal(view.summary.configuredRouterProviders,2)
 assert.deepEqual(view.routerHealth.configured,['openai','gemini'])
 assert.equal(view.workerFleet[0].role,'software')
 assert.equal(view.sla[0].missionId,'m1')
})
