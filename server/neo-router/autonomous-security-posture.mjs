import {
  normalizeSecuritySignal,
  correlateSecuritySignals,
  createIncidentCase,
  preserveForensicEvidence,
  selectContainmentPlaybook,
  executeDefensiveResponse,
  securityPosture
} from './security-operations.mjs'

const clone=v=>structuredClone(v)
const rank={info:0,low:1,medium:2,high:3,critical:4}

export function confidenceForSignals(signals=[]){
  if(!signals.length)return 0
  const sourceCount=new Set(signals.map(s=>s.source)).size
  const critical=signals.some(s=>s.severity==='critical')
  const high=signals.filter(s=>['high','critical'].includes(s.severity)).length
  return Math.min(0.99,0.45+(sourceCount-1)*0.2+high*0.1+(critical?0.1:0))
}

export function buildAutonomousSecurityDecision({signals=[],approved=false,policy}={}){
  if(!policy)throw new TypeError('policy required')
  const normalized=signals.map(normalizeSecuritySignal)
  const correlations=correlateSecuritySignals(normalized)
  const confidence=confidenceForSignals(normalized)
  const severity=normalized.reduce((m,x)=>rank[x.severity]>rank[m]?x.severity:m,'info')
  const incident=normalized.length?createIncidentCase({
    id:`SEC-${Date.now()}`,
    signals:normalized,
    classification:'autonomous-security-assessment'
  }):null
  const evidence=incident?normalized.map(signal=>preserveForensicEvidence({
    incidentId:incident.id,
    evidence:signal,
    source:signal.source
  })):[]
  const basePlaybook=incident?selectContainmentPlaybook({incident}):{incidentId:null,actions:[],approvalRequired:false}
  const autoSafe=new Set(policy.containment.auto_safe||[])
  const approvalRequiredSet=new Set(policy.containment.approval_required||[])
  const corroborated=new Set(normalized.map(s=>s.source)).size>=2
  const highImpactAllowed=approved && (!policy.decision.require_corroboration_for_high_impact || corroborated)
  const actions=(basePlaybook.actions||[]).map(action=>({
    action,
    mode:autoSafe.has(action)?'AUTO_SAFE':approvalRequiredSet.has(action)?'APPROVAL_REQUIRED':'REVIEW',
    authorized:autoSafe.has(action) || (approvalRequiredSet.has(action)&&highImpactAllowed)
  }))
  const response=executeDefensiveResponse({
    playbook:{
      incidentId:basePlaybook.incidentId,
      actions:actions.filter(a=>a.authorized).map(a=>a.action),
      approvalRequired:false
    },
    approved:true
  })
  return {
    gate:109,
    incident,
    correlations,
    confidence,
    severity,
    corroborated,
    posture:securityPosture({signals:normalized,incidents:incident?[incident]:[]}),
    evidence,
    actions,
    executed_safe_response:response,
    escalation_required:
      severity==='critical' ||
      confidence<policy.decision.minimum_auto_confidence ||
      actions.some(a=>a.mode==='APPROVAL_REQUIRED'&&!a.authorized),
    protected_boundary:'Suspicion alone does not authorize funds movement, asset seizure, destructive deletion, or critical-key destruction.'
  }
}

export function buildSecurityAutopilotStatus({routerHealth,policy,signals=[]}={}){
  const posture=securityPosture({signals,incidents:[]})
  return {
    ok:Boolean(routerHealth?.ok),
    service:'neo-autopilot-security',
    gate:109,
    router:clone(routerHealth||null),
    security:posture,
    autonomy:{
      auto_safe:clone(policy?.containment?.auto_safe||[]),
      approval_required:clone(policy?.containment?.approval_required||[]),
      prohibited_from_suspicion:clone(policy?.containment?.never_from_suspicion_alone||[])
    },
    site:{
      host:policy?.site_autopilot?.host||'neo.holytemples.org',
      operator_surface:policy?.site_autopilot?.operator_surface||'/autopilot/',
      ai_gateway_prefix:policy?.site_autopilot?.ai_gateway_prefix||'/api/ai/'
    },
    generated_at:new Date().toISOString()
  }
}
