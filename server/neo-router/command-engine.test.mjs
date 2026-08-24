import test from 'node:test'
import assert from 'node:assert/strict'
import { createMissionEngine } from './mission-engine.mjs'
import { createMemoryEventStore } from './event-engine.mjs'
import { classifyEvent, correlateEvents, buildCommandResponse, assessMissionSla } from './policy-intelligence.mjs'
import { createCommandEngine } from './command-engine.mjs'

function runtime(engine){return {withEngine:async fn=>fn(engine)}}

test('classifies critical integration failure for coordinated response',()=>{const c=classifyEvent({source:'airbyte',type:'connector.degraded',payload:{}});assert.equal(c.severity,'critical');assert.equal(c.decision,'coordinated_response');assert.equal(c.escalationTier,3)})
test('correlates repeated and cross-source events',()=>{const now=Date.now();const events=[{id:'1',source:'github',type:'workflow_run.failed',correlationKey:'neo',receivedAt:new Date(now-1000).toISOString()},{id:'2',source:'airbyte',type:'connector.degraded',correlationKey:'neo',receivedAt:new Date(now-2000).toISOString()}];const groups=correlateEvents(events,{now});assert.equal(groups.length,1);assert.equal(groups[0].pattern,'cross_source')})
test('escalated response requires human approval',()=>{const r=buildCommandResponse({decision:'escalate',severity:'high',escalationTier:2,slaMinutes:60});assert.equal(r.requiresHumanApproval,true);assert.equal(r.priority,'high')})
test('command engine creates governed escalation mission',async()=>{let i=0;const engine=createMissionEngine({idFactory:()=>`id${++i}`});const store=createMemoryEventStore();const event={id:'evt-critical',source:'gmail',type:'message.important',payload:{threadId:'t1'},receivedAt:new Date().toISOString()};await store.put(event);const command=createCommandEngine({runtime:runtime(engine),eventStore:store});const result=await command.command(event);assert.equal(result.mission.priority,'high');assert.equal(result.mission.actions[0].approvalRequired,true);assert.match(result.mission.provenance.join(' '),/policy:important-mail/)})
test('observe policy does not create mission',async()=>{const engine=createMissionEngine();const store=createMemoryEventStore();const event={id:'evt-x',source:'unknown',type:'noise',payload:{},receivedAt:new Date().toISOString()};await store.put(event);const command=createCommandEngine({runtime:runtime(engine),eventStore:store});const result=await command.command(event);assert.equal(result.mission,null);assert.equal(engine.list().length,0)})
test('SLA assessment reports breached and at risk states',()=>{assert.equal(assessMissionSla({sla:{dueAt:new Date(Date.now()-1000).toISOString()}}).state,'breached');assert.equal(assessMissionSla({sla:{dueAt:new Date(Date.now()+5*60000).toISOString()}}).state,'at_risk')})
