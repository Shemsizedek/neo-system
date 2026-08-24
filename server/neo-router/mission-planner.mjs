import { MISSION_STATUS } from './mission-engine.mjs'

function safeId(value){return String(value).toUpperCase().replace(/[^A-Z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48)}

export function decomposeMission(engine,{id,objective,priority='normal',provenance=[],workstreams=[]}={}){
  if(!engine)throw new TypeError('engine is required')
  if(!objective)throw new TypeError('objective is required')
  if(!workstreams.length)throw new TypeError('at least one workstream is required')
  const parentId=id??`NEO-PLAN-${Date.now()}`
  const parent=engine.queue({id:parentId,objective,priority,route:['origin','mission-engine-v6'],provenance:[...provenance,'planner:v6']})
  engine.prepare(parentId)
  const ids=new Map(workstreams.map((w,i)=>[w.id??String(i+1),`${parentId}-${safeId(w.id??`STEP-${i+1}`)}`]))
  const children=[]
  for(const [index,w] of workstreams.entries()){
    const key=w.id??String(index+1);const childId=ids.get(key)
    const deps=(w.dependsOn??[]).map(dep=>{const mapped=ids.get(dep);if(!mapped)throw new Error(`Unknown workstream dependency: ${dep}`);return mapped})
    const actions=(w.actions??[]).map((a,n)=>({...a,id:a.id??`${childId}-ACTION-${n+1}`,workerRole:a.workerRole??w.workerRole}))
    children.push(engine.queue({id:childId,objective:w.objective??`${objective}: ${key}`,priority:w.priority??priority,route:['origin',w.workerRole??'general',...(w.route??[])],actions,dependencies:deps,provenance:[...provenance,`parent:${parentId}`,`workstream:${key}`]}))
  }
  return {parent:engine.get(parentId),children}
}

export function reconcileMissionPlan(engine,parentId){
  const parent=engine.get(parentId);if(!parent)throw new Error(`Unknown parent mission: ${parentId}`)
  const children=engine.list().filter(m=>m.provenance?.includes(`parent:${parentId}`))
  if(!children.length)return {parent,children,state:'empty'}
  const failed=children.find(m=>[MISSION_STATUS.FAILED,MISSION_STATUS.CANCELLED].includes(m.status))
  if(failed&&parent.status===MISSION_STATUS.RUNNING){engine.transition(parentId,MISSION_STATUS.FAILED,{error:`child mission ${failed.id} ${failed.status}`});return {parent:engine.get(parentId),children,state:'failed'}}
  if(children.every(m=>m.status===MISSION_STATUS.COMPLETED)&&parent.status===MISSION_STATUS.RUNNING){engine.transition(parentId,MISSION_STATUS.COMPLETED,{result:{children:children.map(m=>m.id)}});return {parent:engine.get(parentId),children,state:'completed'}}
  return {parent,children,state:'running'}
}

export function releaseReadinessPlan({repo='Shemsizedek/neo-system',asanaProjectGid=null,notify=null}={}){
  const workstreams=[
    {id:'software-audit',workerRole:'software',objective:`Inspect ${repo} release readiness`,actions:[{connector:'github-live',type:'github.list_prs',repo,state:'open',capabilities:['github.read']}]},
    {id:'operations-track',workerRole:'operations',objective:'Create release tracking task',dependsOn:['software-audit'],actions:[{connector:'asana-live',type:'asana.create_task',mutating:true,approvalRequired:true,name:`Release readiness: ${repo}`,notes:'Created by NEO Router Mission Engine v6 after software audit.',projectGid:asanaProjectGid,capabilities:['asana.write']}]},
  ]
  if(notify)workstreams.push({id:'communications-draft',workerRole:'communications',objective:'Prepare release status communication',dependsOn:['software-audit'],actions:[{connector:'gmail-live',type:'gmail.create_draft',mutating:true,approvalRequired:true,to:notify.to,subject:notify.subject??`Release readiness: ${repo}`,body:notify.body??'NEO Router has completed the software readiness audit. Review the Control Center for current status.',capabilities:['gmail.draft']}]})
  return workstreams
}
