import crypto from 'node:crypto'
import {createServiceTelemetry,calculateSli,detectReliabilityAnomalies,correlateRootCause,forecastReliability,buildReliabilityCommandView} from '../neo-router/reliability-intelligence.mjs'

const now=()=>new Date().toISOString()
const clone=v=>structuredClone(v)

export function normalizeSignal(input={}){
  if(!input.type||!input.service)throw new TypeError('type and service required')
  return {id:input.id||`OBS-${crypto.randomUUID()}`,type:String(input.type).toUpperCase(),service:String(input.service),timestamp:input.timestamp||now(),severity:input.severity||'normal',payload:clone(input.payload||{}),trace_id:input.trace_id||null}
}

export function calculateCapacity({used=0,total=0}={}){
  const pct=total>0?(Number(used)/Number(total))*100:0
  return {used:Number(used),total:Number(total),percent:pct,state:pct>=90?'CRITICAL':pct>=75?'WARNING':'HEALTHY'}
}

export function buildServiceSlo({service,good,total,target=0.999,window='30d'}={}){
  return {service,...calculateSli({good,total,target,window})}
}

export function classifyAlert({slo,capacity,anomalies=[]}={}){
  if(slo?.burnRate>=10||capacity?.state==='CRITICAL'||anomalies.some(a=>a.severity==='critical'))return 'CRITICAL'
  if(slo?.burnRate>=4||capacity?.state==='WARNING'||anomalies.length)return 'HIGH'
  if(slo?.status==='at-risk')return 'WATCH'
  return 'NORMAL'
}

export function buildObservabilityState({samples=[],slos=[],capacities=[],thresholds={}}={}){
  const anomalies=detectReliabilityAnomalies(samples,thresholds)
  const dependencyMap=Object.fromEntries(samples.map(s=>[s.service,s.dependencies||[]]))
  const correlated=correlateRootCause({anomalies,dependencyMap})
  const forecasts=[]
  for(const service of [...new Set(samples.map(s=>s.service))]){
    const history=samples.filter(s=>s.service===service)
    const f=forecastReliability({history,metric:'availability'})
    forecasts.push({...f,service})
  }
  const command=buildReliabilityCommandView({samples,slis:slos,anomalies:correlated,forecasts})
  const alerts=[...new Set(samples.map(s=>s.service))].map(service=>{
    const slo=slos.find(x=>x.service===service)
    const cap=capacities.find(x=>x.service===service)
    const a=correlated.filter(x=>x.service===service)
    return {service,severity:classifyAlert({slo,capacity:cap,anomalies:a}),slo,capacity:cap,anomalies:a}
  })
  return {gate:119,estate:'Global Vast Estate',generated_at:now(),command,alerts,telemetry:{samples:samples.length,services:command.services}}
}

export function createNocSnapshot({state,logs=0,traces=0,audits=0}={}){
  return {estate:'Global Vast Estate',fabric:'NEO Sovereign Observability / NOC',posture:state?.command?.posture||'unknown',services:state?.command?.services||0,alerts:clone(state?.alerts||[]),signals:{metrics:state?.telemetry?.samples||0,logs,traces,audits},generated_at:now()}
}

export function telemetrySample({service,timestamp=now(),metrics={},logs=[],traces=[],dependencies=[]}={}){
  return createServiceTelemetry({service,timestamp,metrics,logs,traces,dependencies})
}
