import { createHash } from 'node:crypto'

function clone(v){return structuredClone(v)}
function now(){return new Date().toISOString()}
function stableId(event){
  if(event?.id)return String(event.id)
  return createHash('sha256').update(JSON.stringify({source:event?.source,type:event?.type,payload:event?.payload??null})).digest('hex')
}

export const DEFAULT_EVENT_RULES=Object.freeze([
  {id:'github-ci-failure',source:'github',type:'workflow_run.failed',priority:'critical',workerRole:'software',objective:'Investigate failed GitHub CI and prepare a remediation plan.',actions:[{connector:'github-live',type:'github.list_prs',capabilities:['github.read']}]},
  {id:'github-pr-ready',source:'github',type:'pull_request.ready_for_review',priority:'high',workerRole:'software',objective:'Review pull request readiness, CI state, and merge risk.',actions:[{connector:'github-live',type:'github.list_prs',capabilities:['github.read']}]},
  {id:'asana-task-changed',source:'asana',type:'task.changed',priority:'normal',workerRole:'operations',objective:'Reconcile changed Asana work with active NEO Router missions.',actions:[]},
  {id:'gmail-important',source:'gmail',type:'message.important',priority:'high',workerRole:'communications',objective:'Review an important inbound message and determine the appropriate governed follow-up.',actions:[{connector:'gmail-live',type:'gmail.list',capabilities:['gmail.read']}]},
  {id:'airbyte-degraded',source:'airbyte',type:'connector.degraded',priority:'critical',workerRole:'integration',objective:'Diagnose a degraded integration and prepare fallback or remediation steps.',actions:[]},
])

export function createMemoryEventStore(){
  const events=new Map()
  return Object.freeze({mode:'memory',durable:false,
    async put(event){const id=stableId(event);if(events.has(id))return {duplicate:true,event:clone(events.get(id))};const record={...clone(event),id,receivedAt:event.receivedAt??now(),status:event.status??'received'};events.set(id,record);return {duplicate:false,event:clone(record)}},
    async update(id,patch){const current=events.get(id);if(!current)return null;const next={...current,...clone(patch)};events.set(id,next);return clone(next)},
    async list(limit=100){return [...events.values()].sort((a,b)=>Date.parse(b.receivedAt)-Date.parse(a.receivedAt)).slice(0,limit).map(clone)},
    async get(id){const e=events.get(id);return e?clone(e):null},
  })
}

function enc(v){return encodeURIComponent(String(v))}
async function redisCmd(url,token,parts){const r=await fetch(`${url}/${parts.map(enc).join('/')}`,{headers:{Authorization:`Bearer ${token}`}});if(!r.ok)throw new Error(`Redis command failed: ${r.status}`);return r.json()}
export function createRedisEventStore({url=process.env.UPSTASH_REDIS_REST_URL,token=process.env.UPSTASH_REDIS_REST_TOKEN,key='neo:router:events'}={}){
  if(!url||!token)return createMemoryEventStore()
  return Object.freeze({mode:'redis',durable:true,
    async put(event){const id=stableId(event);const seen=await redisCmd(url,token,['set',`${key}:seen:${id}`,'1','nx','ex',604800]);if(seen?.result!== 'OK'){const current=await this.get(id);return {duplicate:true,event:current??{...event,id}}}const record={...clone(event),id,receivedAt:event.receivedAt??now(),status:event.status??'received'};await redisCmd(url,token,['set',`${key}:item:${id}`,JSON.stringify(record)]);await redisCmd(url,token,['lpush',`${key}:list`,id]);await redisCmd(url,token,['ltrim',`${key}:list`,0,999]);return {duplicate:false,event:record}},
    async update(id,patch){const current=await this.get(id);if(!current)return null;const next={...current,...clone(patch)};await redisCmd(url,token,['set',`${key}:item:${id}`,JSON.stringify(next)]);return next},
    async get(id){const r=await redisCmd(url,token,['get',`${key}:item:${id}`]);if(!r?.result)return null;try{return JSON.parse(r.result)}catch{return null}},
    async list(limit=100){const ids=(await redisCmd(url,token,['lrange',`${key}:list`,0,Math.max(0,limit-1)]))?.result??[];const out=[];for(const id of ids){const item=await this.get(id);if(item)out.push(item)}return out},
  })
}

export function matchEventRule(event,rules=DEFAULT_EVENT_RULES){return rules.find(r=>r.source===event.source&&r.type===event.type)??null}

export async function ingestRouterEvent({event,store=createRedisEventStore(),runtime,rules=DEFAULT_EVENT_RULES}={}){
  if(!event?.source||!event?.type)throw new TypeError('event source and type are required')
  if(!runtime)throw new TypeError('runtime is required')
  const saved=await store.put(event)
  if(saved.duplicate)return {duplicate:true,event:saved.event,mission:null,rule:null}
  const rule=matchEventRule(saved.event,rules)
  if(!rule){await store.update(saved.event.id,{status:'ignored'});return {duplicate:false,event:{...saved.event,status:'ignored'},mission:null,rule:null}}
  const mission=await runtime.withEngine(engine=>engine.queue({
    id:`NEO-EVENT-${saved.event.id.slice(0,18)}`,
    objective:rule.objective,
    priority:rule.priority,
    workerRole:rule.workerRole,
    actions:clone(rule.actions??[]),
    provenance:[`event:${saved.event.source}:${saved.event.id}`],
  }))
  await store.update(saved.event.id,{status:'routed',ruleId:rule.id,missionId:mission.id})
  return {duplicate:false,event:{...saved.event,status:'routed',ruleId:rule.id,missionId:mission.id},mission,rule}
}
