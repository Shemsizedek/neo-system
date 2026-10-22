import { buildDependencyMap, correlateRootCause } from './reliability-intelligence.mjs'

const clone=v=>structuredClone(v)
const severityWeight=s=>({critical:100,high:60,medium:40,normal:25,low:10,info:5}[String(s||'info').toLowerCase()]||5)

export function normalizeSignal(input={}){
  if(!input.source||!input.type)throw new TypeError('source and type are required')
  return {
    id:String(input.id||`${input.source}:${input.type}:${input.timestamp||Date.now()}`),
    source:String(input.source),
    type:String(input.type),
    service:String(input.service||input.payload?.service||'unknown'),
    severity:String(input.severity||'info').toLowerCase(),
    timestamp:input.timestamp||new Date().toISOString(),
    correlation_id:input.correlation_id||null,
    dependency:input.dependency||null,
    blast_radius:Number(input.blast_radius||1),
    recurrence:Number(input.recurrence||1),
    confidence:Number.isFinite(Number(input.confidence))?Number(input.confidence):0.5,
    payload:clone(input.payload||{})
  }
}

export function correlateSituation(signals=[],{windowMs=15*60*1000,now=Date.now()}={}){
  const normalized=signals.map(normalizeSignal).filter(s=>now-Date.parse(s.timestamp)<=windowMs)
  const groups=new Map()
  for(const signal of normalized){
    const key=signal.correlation_id||signal.service
    const arr=groups.get(key)||[]
    arr.push(signal)
    groups.set(key,arr)
  }
  return [...groups.entries()].map(([key,items])=>{
    const sources=[...new Set(items.map(x=>x.source))]
    const severity=items.some(x=>x.severity==='critical')?'critical':items.some(x=>x.severity==='high')?'high':items.some(x=>x.severity==='medium')?'medium':'normal'
    const blastRadius=Math.max(...items.map(x=>x.blast_radius||1))
    const recurrence=Math.max(...items.map(x=>x.recurrence||1))
    const confidence=items.reduce((a,b)=>a+b.confidence,0)/items.length
    return {
      situation_id:`SIT-${key}`,
      key,
      signals:items,
      sources,
      cross_source:sources.length>1,
      severity,
      blast_radius:blastRadius,
      recurrence,
      confidence,
      inferred_root_cause:false
    }
  })
}

export function scoreAttention(situation,policy){
  const a=policy.attention
  const score=
    severityWeight(situation.severity)+
    (situation.cross_source?a.cross_source_bonus:0)+
    Math.max(0,situation.blast_radius-1)*a.blast_radius_weight+
    Math.max(0,situation.recurrence-1)*a.recurrence_weight
  return Math.round(score*Math.max(0.25,Math.min(1,situation.confidence)))
}

export function buildSituationalState({signals=[],telemetry=[],policy,now=new Date().toISOString()}={}){
  if(!policy)throw new TypeError('policy required')
  const situations=correlateSituation(signals,{now:Date.parse(now)})
  const dependencyMap=buildDependencyMap(telemetry)
  const anomalies=situations.flatMap(s=>s.signals.filter(x=>x.severity==='critical'||x.severity==='high').map(x=>({
    service:x.service,
    metric:x.type,
    value:1,
    threshold:{max:0},
    timestamp:x.timestamp,
    severity:x.severity
  })))
  const correlated=correlateRootCause({anomalies,dependencyMap})
  const byService=new Map(correlated.map(x=>[x.service,x]))
  const ranked=situations.map(s=>{
    const candidate=byService.get(s.signals[0]?.service)
    const next={...s}
    if(candidate){
      next.blast_radius=Math.max(next.blast_radius,candidate.blastRadius||1)
      next.inferred_root_cause=Boolean(candidate.rootCauseCandidate)
      next.dependents=candidate.dependents||[]
    }
    next.attention_score=scoreAttention(next,policy)
    return next
  }).sort((a,b)=>b.attention_score-a.attention_score)

  const unknown=signals.length===0
  const state=unknown?'UNKNOWN':
    ranked.some(x=>x.severity==='critical')?'CRITICAL':
    ranked.some(x=>x.severity==='high')?'DEGRADED':
    ranked.length?'WATCH':'NORMAL'

  return {
    gate:108,
    generated_at:now,
    state,
    signal_count:signals.length,
    situation_count:ranked.length,
    situations:ranked,
    attention_queue:ranked.map(x=>({situation_id:x.situation_id,score:x.attention_score,severity:x.severity,service:x.signals[0]?.service||'unknown'})),
    dependency_map:dependencyMap,
    interpretation_note:'Correlated situations are evidence-backed operational interpretations; inferred root-cause candidates are not proven causation.'
  }
}
