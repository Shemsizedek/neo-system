import crypto from 'node:crypto'

const clone=v=>structuredClone(v)
const now=()=>new Date().toISOString()
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex')

export function createCommunicationEnvelope({
  eventId,
  correlationId,
  eventType,
  source,
  payload={},
  priority='NORMAL',
  recipients=[],
  sensitivity='INTERNAL',
  provenance=[]
}={}){
  if(!eventType||!source)throw new TypeError('eventType and source are required')
  const id=eventId||`EVT-${hash({eventType,source,payload}).slice(0,24)}`
  const correlation=correlationId||`CORR-${hash({source,eventType,id}).slice(0,20)}`
  return {
    event_id:id,
    correlation_id:correlation,
    event_type:String(eventType).toUpperCase(),
    source,
    priority:String(priority).toUpperCase(),
    recipients:[...new Set(recipients)],
    sensitivity,
    payload:clone(payload),
    provenance:[...provenance],
    created_at:now()
  }
}

export function routeCommunication(envelope,policy){
  if(!envelope)throw new TypeError('envelope required')
  const route=(policy.routes||[]).find(r=>r.event_type===envelope.event_type)
  const recipients=route?.recipients||['NEO-SCAN']
  return {
    ...clone(envelope),
    priority:route?.priority||envelope.priority||'NORMAL',
    recipients:[...new Set(recipients)],
    route_status:route?'MATCHED':'DEFAULTED',
    routed_at:now()
  }
}

export function minimizePayload(envelope){
  const out=clone(envelope)
  const sensitiveKeys=new Set(['password','secret','token','private_key','seed','seed_phrase','credential'])
  if(out.payload&&typeof out.payload==='object'){
    for(const key of Object.keys(out.payload)){
      if(sensitiveKeys.has(key.toLowerCase())) out.payload[key]='[REDACTED]'
    }
  }
  return out
}

export function createMemoryCommunicationStore(){
  const events=new Map()
  return {
    async put(envelope){
      if(events.has(envelope.event_id))return {duplicate:true,event:clone(events.get(envelope.event_id))}
      events.set(envelope.event_id,clone(envelope))
      return {duplicate:false,event:clone(envelope)}
    },
    async list(){return [...events.values()].map(clone)},
    async get(id){return events.has(id)?clone(events.get(id)):null}
  }
}

export async function communicate({event,policy,store=createMemoryCommunicationStore(),deliver}={}){
  if(!policy)throw new TypeError('policy required')
  const envelope=minimizePayload(createCommunicationEnvelope(event))
  const routed=routeCommunication(envelope,policy)
  const saved=await store.put(routed)
  if(saved.duplicate)return {duplicate:true,deliveries:[],event:saved.event}
  const deliveries=[]
  for(const recipient of routed.recipients){
    const result=deliver?await deliver({recipient,event:clone(routed)}):{ok:true,recipient,mode:'simulated'}
    deliveries.push(result)
  }
  return {duplicate:false,event:routed,deliveries}
}

export function buildEscalation(event){
  if(!event)throw new TypeError('event required')
  const critical=event.priority==='CRITICAL'
  return {
    correlation_id:event.correlation_id,
    escalate:critical,
    destination:critical?'OPERATOR':null,
    reason:critical?'critical_event':null
  }
}
