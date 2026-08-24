import { assessMissionSla, buildResponsePosture, classifyEvent, correlateEvents, loadCommandPolicies } from './command-intelligence.mjs'

function clone(v){return structuredClone(v)}
export function buildOperationsCommandCenter({telemetry={},inboundEvents=[],deadLetters=[],workerFleet=[],policies=loadCommandPolicies(),now=new Date().toISOString()}={}){
 const missions=telemetry.missions??[], approvals=telemetry.approvals??[], connectors=telemetry.connectors??[]
 const incidents=inboundEvents.map(event=>{const classification=classifyEvent(event,policies);const correlation=correlateEvents(event,inboundEvents);return {event:clone(event),classification,correlation,posture:buildResponsePosture({classification,correlation})}})
 const sla=missions.map(mission=>({missionId:mission.id,...assessMissionSla(mission,now)}))
 const clusters=incidents.filter(i=>i.correlation?.correlated).map(i=>({eventId:i.event.id,key:i.correlation.key,count:i.correlation.count,sources:i.correlation.sources,severity:i.classification.severity,action:i.posture.action}))
 const escalations=incidents.filter(i=>i.classification.escalationTier>0||i.posture.action==='coordinated_response').map(i=>({eventId:i.event.id,tier:i.classification.escalationTier,severity:i.classification.severity,action:i.posture.action,approvalRequired:i.classification.approvalRequired}))
 return {generatedAt:now,summary:{incidents:incidents.length,correlatedClusters:clusters.length,escalations:escalations.length,slaAtRisk:sla.filter(x=>x.state==='at_risk').length,slaBreached:sla.filter(x=>x.state==='breached').length,deadLetters:deadLetters.length,pendingApprovals:approvals.filter(a=>a.status==='pending').length},incidents,clusters,escalations,sla,deadLetters:clone(deadLetters),workerFleet:clone(workerFleet),connectors:clone(connectors),policies:clone(policies)}
}
