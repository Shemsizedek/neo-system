import { classifyEvent, correlateEvents, buildCommandResponse, loadCommandPolicies } from './policy-intelligence.mjs'

function clone(v){return structuredClone(v)}
export function createCommandEngine({runtime,eventStore,policies=loadCommandPolicies(),clock=()=>Date.now()}={}){
  if(!runtime)throw new TypeError('runtime is required')
  if(!eventStore)throw new TypeError('eventStore is required')
  async function evaluate(event){const classification=classifyEvent(event,policies);const response=buildCommandResponse(classification);return {event:clone(event),classification,response}}
  async function correlate({limit=100,windowMs}={}){return correlateEvents(await eventStore.list(limit),{windowMs,now:clock()})}
  async function command(event){
    const intelligence=await evaluate(event)
    if(intelligence.classification.decision==='observe')return {...intelligence,mission:null}
    const recent=await eventStore.list(100),clusters=correlateEvents(recent,{now:clock()}),cluster=clusters.find(c=>c.events.some(e=>e.id===event.id))??null
    const response=buildCommandResponse(intelligence.classification,cluster)
    const dueAt=intelligence.classification.slaMinutes?new Date(clock()+intelligence.classification.slaMinutes*60000).toISOString():null
    const mission=await runtime.withEngine(engine=>engine.queue({
      id:`NEO-COMMAND-${String(event.id).slice(0,18)}`,
      objective:`${response.mode.toUpperCase()}: ${event.source}/${event.type}${dueAt?` — SLA due ${dueAt}`:''}`,
      priority:response.priority,
      route:['origin-command-intelligence',event.source],
      provenance:[`event:${event.source}:${event.id}`,`policy:${intelligence.classification.policyId??'observe'}`,...(cluster?[`correlation:${cluster.key}:${cluster.pattern}:${cluster.count}`]:[])],
      actions:response.requiresHumanApproval?[{connector:'router-housekeeping',type:'command.escalation',approvalRequired:true,context:{tier:response.escalationTier}}]:[],
    }))
    return {...intelligence,response,cluster,mission,sla:{dueAt,minutes:intelligence.classification.slaMinutes}}
  }
  async function scan(){const events=await eventStore.list(100),clusters=correlateEvents(events,{now:clock()});return {generatedAt:new Date(clock()).toISOString(),policies:policies.map(p=>({id:p.id,source:p.source,type:p.type,severity:p.severity,decision:p.decision,slaMinutes:p.slaMinutes,escalationTier:p.escalationTier})),clusters}}
  return Object.freeze({evaluate,correlate,command,scan})
}
