import crypto from 'node:crypto'
import {evaluateReleaseWindow} from '../neo-router/change-intelligence.mjs'

const clone=v=>structuredClone(v)
const now=()=>new Date().toISOString()

export function normalizeResource(input={}){
  if(!input.fabric||!input.resource_id)throw new TypeError('fabric and resource_id required')
  return {
    fabric:String(input.fabric).toUpperCase(),
    resource_id:String(input.resource_id),
    desired:clone(input.desired||{}),
    observed:clone(input.observed||{}),
    updated_at:input.updated_at||now()
  }
}

export function diffState(desired={},observed={}){
  const keys=[...new Set([...Object.keys(desired),...Object.keys(observed)])]
  return keys.flatMap(key=>{
    const a=JSON.stringify(desired[key]),b=JSON.stringify(observed[key])
    return a===b?[]:[{field:key,desired:clone(desired[key]),observed:clone(observed[key])}]
  })
}

export function classifyDrift(resource){
  const differences=diffState(resource.desired,resource.observed)
  if(!differences.length)return {state:'IN_SYNC',differences,impact:'NONE'}
  const fields=new Set(differences.map(x=>x.field))
  const protectedFields=['dns','primary','root_key','ca_key','secret_provider','production_route']
  const protectedHit=protectedFields.find(f=>fields.has(f))
  return {state:protectedHit?'PROTECTED_DRIFT':'DRIFT',differences,impact:protectedHit?'HIGH':'LOW'}
}

export function selectRepairAction({resource,drift}={}){
  if(!drift||drift.state==='IN_SYNC')return {action:'NONE',approval_required:false}
  if(drift.state==='PROTECTED_DRIFT')return {action:'ESCALATE',approval_required:true}
  if(resource.fabric==='COMPUTE'&&drift.differences.some(x=>x.field==='health'))return {action:'REFRESH_HEALTH',approval_required:false}
  if(resource.fabric==='NETWORK'&&drift.differences.some(x=>x.field==='discovery'))return {action:'REPAIR_DISCOVERY',approval_required:false}
  if(resource.fabric==='CONTINUITY'&&drift.differences.some(x=>x.field==='backup_state'))return {action:'RETRY_BACKUP',approval_required:false}
  if(resource.fabric==='SECRETS'&&drift.differences.some(x=>x.field==='lease_state'))return {action:'RENEW_SHORT_LEASE',approval_required:false}
  return {action:'REVIEW',approval_required:true}
}

export function reconcileResource({resource,maintenanceWindows=[],approved=false,executor}={}){
  const drift=classifyDrift(resource),repair=selectRepairAction({resource,drift})
  if(repair.action==='NONE')return {resource_id:resource.resource_id,status:'IN_SYNC',drift,repair}
  const window=evaluateReleaseWindow({now:new Date(),windows:maintenanceWindows})
  if(repair.approval_required&&!approved)return {resource_id:resource.resource_id,status:'AWAITING_APPROVAL',drift,repair,window}
  if(!window.allowed&&repair.action!=='REFRESH_HEALTH')return {resource_id:resource.resource_id,status:'HELD_FOR_MAINTENANCE_WINDOW',drift,repair,window}
  const result=executor?executor({resource:clone(resource),repair:clone(repair)}):{ok:true,planned:true}
  return {resource_id:resource.resource_id,status:result.ok===false?'REPAIR_FAILED':result.planned?'REPAIR_PLANNED':'REPAIRED',drift,repair,window,execution:clone(result)}
}

export function capacityPlacement({workload,nodes=[],approved=false,production=false}={}){
  const req=workload?.requirements||{}
  const eligible=nodes.filter(n=>n.attested===true&&n.health==='HEALTHY'&&
    Number(n.capacity?.cpu_cores||0)>=Number(req.cpu_cores||0)&&
    Number(n.capacity?.memory_mb||0)>=Number(req.memory_mb||0)&&
    Number(n.capacity?.storage_gb||0)>=Number(req.storage_gb||0))
    .sort((a,b)=>(b.capacity?.memory_mb||0)-(a.capacity?.memory_mb||0))
  if(!eligible.length)return {status:'NO_ELIGIBLE_NODE',node_id:null}
  if(production&&!approved)return {status:'AWAITING_APPROVAL',node_id:null,candidates:eligible.map(x=>x.node_id)}
  return {status:production?'AUTHORIZED_PLACEMENT':'SHADOW_PLACEMENT',node_id:eligible[0].node_id,candidates:eligible.map(x=>x.node_id)}
}

export function reconcileEstate({resources=[],maintenanceWindows=[],approved=false,executor}={}){
  const results=resources.map(resource=>reconcileResource({resource,maintenanceWindows,approved,executor}))
  return {
    run_id:`REC-${crypto.randomUUID()}`,
    estate:'Global Vast Estate',
    generated_at:now(),
    summary:{
      resources:results.length,
      in_sync:results.filter(x=>x.status==='IN_SYNC').length,
      planned:results.filter(x=>x.status==='REPAIR_PLANNED').length,
      awaiting_approval:results.filter(x=>x.status==='AWAITING_APPROVAL').length,
      held:results.filter(x=>x.status==='HELD_FOR_MAINTENANCE_WINDOW').length,
      failed:results.filter(x=>x.status==='REPAIR_FAILED').length
    },
    results
  }
}
