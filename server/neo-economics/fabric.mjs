import crypto from 'node:crypto'

const clone=v=>structuredClone(v)
const now=()=>new Date().toISOString()

export function createCostModel(input={}){
  return {
    currency_unit:input.currency_unit||'NEO_INTERNAL_UNIT',
    cpu_core_hour:Number(input.cpu_core_hour||0),
    memory_gb_hour:Number(input.memory_gb_hour||0),
    storage_gb_month:Number(input.storage_gb_month||0),
    gpu_hour:Number(input.gpu_hour||0),
    network_gb:Number(input.network_gb||0),
    power_kwh:Number(input.power_kwh||0),
    updated_at:input.updated_at||now(),
    source:input.source||'internal'
  }
}

export function estimateWorkloadCost({requirements={},durationHours=1,storageMonths=0,networkGb=0,powerKwh=0,costModel}={}){
  if(!costModel)throw new TypeError('costModel required')
  const components={
    cpu:Number(requirements.cpu_cores||0)*Number(durationHours)*costModel.cpu_core_hour,
    memory:(Number(requirements.memory_mb||0)/1024)*Number(durationHours)*costModel.memory_gb_hour,
    storage:Number(requirements.storage_gb||0)*Number(storageMonths)*costModel.storage_gb_month,
    gpu:Number(requirements.gpu_count||0)*Number(durationHours)*costModel.gpu_hour,
    network:Number(networkGb)*costModel.network_gb,
    power:Number(powerKwh)*costModel.power_kwh
  }
  return {components,total:Object.values(components).reduce((a,b)=>a+b,0),currency_unit:costModel.currency_unit}
}

export function createLicenseEntitlement(input={}){
  if(!input.license_id||!input.holder||!input.license_class)throw new TypeError('license_id, holder and license_class required')
  return {
    license_id:String(input.license_id),
    holder:String(input.holder),
    license_class:String(input.license_class),
    token_asset:input.token_asset||null,
    scope:clone(input.scope||{}),
    quota:clone(input.quota||{}),
    reservation:clone(input.reservation||{}),
    revenue_share_bps:Number(input.revenue_share_bps||0),
    territory:input.territory||null,
    authority_status:input.authority_status||'USER_DESIGNATED',
    evidence_refs:clone(input.evidence_refs||[]),
    active:input.active!==false,
    created_at:input.created_at||now()
  }
}

export function authorizeEntitlement({license,resource,amount=0,scope={}}={}){
  if(!license?.active)return {authorized:false,reason:'license_inactive'}
  const limit=Number(license.quota?.[resource]??Infinity)
  if(Number(amount)>limit)return {authorized:false,reason:'quota_exceeded',limit}
  for(const [k,v] of Object.entries(scope||{}))if(license.scope?.[k]!=null&&license.scope[k]!==v)return {authorized:false,reason:'scope_mismatch',field:k}
  return {authorized:true,reason:'entitled',limit}
}

export function createReservation(input={}){
  if(!input.reservation_id||!input.holder||!input.resource)throw new TypeError('reservation_id, holder and resource required')
  return {reservation_id:String(input.reservation_id),holder:String(input.holder),resource:String(input.resource),amount:Number(input.amount||0),start_at:input.start_at||now(),end_at:input.end_at||null,priority:input.priority||'STANDARD',license_id:input.license_id||null,status:'ACTIVE'}
}

export function allocateCapacity({workloads=[],nodes=[],reservations=[],licenses=[]}={}){
  const ranked=[...workloads].sort((a,b)=>Number(b.priority_weight||0)-Number(a.priority_weight||0))
  const remaining=new Map(nodes.map(n=>[n.node_id,{...clone(n.capacity||{})}]))
  const placements=[]
  for(const w of ranked){
    const lic=w.license_id?licenses.find(x=>x.license_id===w.license_id):null
    if(lic){
      const entitled=authorizeEntitlement({license:lic,resource:'CPU_CORE_HOUR',amount:Number(w.requirements?.cpu_cores||0)})
      if(!entitled.authorized){placements.push({workload_id:w.workload_id,status:'LICENSE_BLOCKED',reason:entitled.reason});continue}
    }
    const reserved=reservations.filter(r=>r.status==='ACTIVE'&&r.holder===w.holder)
    const candidates=nodes.filter(n=>n.attested===true&&n.health==='HEALTHY').filter(n=>{
      const cap=remaining.get(n.node_id)||{}
      return Number(cap.cpu_cores||0)>=Number(w.requirements?.cpu_cores||0)&&Number(cap.memory_mb||0)>=Number(w.requirements?.memory_mb||0)&&Number(cap.storage_gb||0)>=Number(w.requirements?.storage_gb||0)
    })
    if(!candidates.length){placements.push({workload_id:w.workload_id,status:'NO_CAPACITY'});continue}
    candidates.sort((a,b)=>{
      const ar=reserved.some(r=>r.resource==='NODE'&&String(r.amount)===a.node_id)?1:0
      const br=reserved.some(r=>r.resource==='NODE'&&String(r.amount)===b.node_id)?1:0
      return br-ar||Number((remaining.get(b.node_id)||{}).memory_mb||0)-Number((remaining.get(a.node_id)||{}).memory_mb||0)
    })
    const node=candidates[0],cap=remaining.get(node.node_id)
    cap.cpu_cores=Number(cap.cpu_cores||0)-Number(w.requirements?.cpu_cores||0)
    cap.memory_mb=Number(cap.memory_mb||0)-Number(w.requirements?.memory_mb||0)
    cap.storage_gb=Number(cap.storage_gb||0)-Number(w.requirements?.storage_gb||0)
    placements.push({workload_id:w.workload_id,node_id:node.node_id,status:'ALLOCATED'})
  }
  return {placements,remaining:Object.fromEntries(remaining)}
}

export function createChargebackEntry({holder,workloadId,amount,currencyUnit='NEO_INTERNAL_UNIT',costCenter='INFRASTRUCTURE',licenseId=null}={}){
  if(!holder||!workloadId)throw new TypeError('holder and workloadId required')
  return {entry_id:`CHG-${crypto.randomUUID()}`,holder,workload_id:workloadId,amount:Number(amount||0),currency_unit:currencyUnit,cost_center:costCenter,license_id:licenseId,posted_at:now(),ledger_scope:'INTERNAL_ONLY'}
}

export function createCapacityOffer(input={}){
  if(!input.offer_id||!input.node_id||!input.resource)throw new TypeError('offer_id, node_id and resource required')
  return {offer_id:String(input.offer_id),node_id:String(input.node_id),resource:String(input.resource),quantity:Number(input.quantity||0),unit_price:Number(input.unit_price||0),currency_unit:input.currency_unit||'NEO_INTERNAL_UNIT',status:'OPEN',created_at:now()}
}

export function economicSnapshot({licenses=[],reservations=[],offers=[],chargebacks=[]}={}){
  return {
    estate:'Global Vast Estate',
    fabric:'NEO Sovereign Resource and Economic Scheduler',
    licenses:{total:licenses.length,active:licenses.filter(x=>x.active).length,externally_verified:licenses.filter(x=>['INDEPENDENTLY_VERIFIED','STATUTORY_OR_REGULATORY_VERIFIED'].includes(x.authority_status)).length},
    reservations:{active:reservations.filter(x=>x.status==='ACTIVE').length},
    capacity_offers:{open:offers.filter(x=>x.status==='OPEN').length},
    chargeback:{entries:chargebacks.length,total:chargebacks.reduce((n,x)=>n+Number(x.amount||0),0)},
    authority_boundary:'Internal tokenized licenses and community-CCP functions do not establish statutory government, clearing-agency, broker-dealer, securities, or professional licensing authority.',
    generated_at:now()
  }
}
