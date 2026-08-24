import { assessMissionSla, buildCommandResponse, classifyEvent, correlateEvents, loadCommandPolicies } from './policy-intelligence.mjs'

function clone(v){return structuredClone(v)}
export function buildOperationsCommandCenter({telemetry={},inboundEvents=[],deadLetters=[],workerFleet=[],policies=loadCommandPolicies(),now=new Date().toISOString()}={}){
 const missions=telemetry.missions??[], approvals=telemetry.approvals??[], connectors=telemetry.connectors??[]
 const groups=correlateEvents(inboundEvents,{now:Date.parse(now)})
 const incidents=inboundEvents.map(event=>{const classification=classifyEvent(event,policies);const correlation=groups.find(g=>g.events.some(e=>e.id===event.id))??null;return {event:clone(event),classification,correlation,response:buildCommandResponse(classification,correlation)}})
 const sla=missions.map(mission=>({missionId:mission.id,...assessMissionSla(mission,{now:Date.parse(now)})}))
 const clusters=groups.map(g=>({key:g.key,count:g.count,sources:g.sources,types:g.types,pattern:g.pattern}))
 const escalations=incidents.filter(i=>i.response.escalationTier>0||i.response.mode==='coordinated_response').map(i=>({eventId:i.event.id,tier:i.response.escalationTier,severity:i.classification.severity,action:i.response.mode,approvalRequired:i.response.requiresHumanApproval}))
 return {generatedAt:now,summary:{incidents:incidents.length,correlatedClusters:clusters.length,escalations:escalations.length,slaAtRisk:sla.filter(x=>x.state==='at_risk').length,slaBreached:sla.filter(x=>x.state==='breached').length,deadLetters:deadLetters.length,pendingApprovals:approvals.filter(a=>a.status==='pending').length},incidents,clusters,escalations,sla,deadLetters:clone(deadLetters),workerFleet:clone(workerFleet),connectors:clone(connectors),policies:clone(policies)}
}
