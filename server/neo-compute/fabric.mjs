import crypto from 'node:crypto'

const clone=v=>structuredClone(v)
const now=()=>new Date().toISOString()
const b64=v=>Buffer.from(v).toString('base64url')

export function createEnrollmentChallenge({nodeId,ttlSeconds=300}={}){
  if(!nodeId)throw new TypeError('nodeId required')
  const issuedAt=Date.now()
  return {
    challenge_id:`NCH-${crypto.randomUUID()}`,
    node_id:String(nodeId),
    nonce:b64(crypto.randomBytes(32)),
    issued_at:new Date(issuedAt).toISOString(),
    expires_at:new Date(issuedAt+ttlSeconds*1000).toISOString(),
    consumed:false
  }
}

export function buildAttestationPayload({challenge,hardware,capacity,network,agentVersion}={}){
  if(!challenge?.challenge_id||!challenge?.nonce)throw new TypeError('challenge required')
  return {
    challenge_id:challenge.challenge_id,
    node_id:challenge.node_id,
    nonce:challenge.nonce,
    hardware:clone(hardware||{}),
    capacity:clone(capacity||{}),
    network:clone(network||{}),
    agent_version:agentVersion||null
  }
}

export function verifyEnrollmentAttestation({challenge,payload,signature,publicKey,nowMs=Date.now()}={}){
  if(!challenge||!payload||!signature||!publicKey)return {valid:false,reason:'missing_input'}
  if(challenge.consumed)return {valid:false,reason:'challenge_consumed'}
  if(nowMs>Date.parse(challenge.expires_at))return {valid:false,reason:'challenge_expired'}
  if(payload.challenge_id!==challenge.challenge_id||payload.node_id!==challenge.node_id||payload.nonce!==challenge.nonce)return {valid:false,reason:'challenge_mismatch'}
  let valid=false
  try{valid=crypto.verify(null,Buffer.from(JSON.stringify(payload)),publicKey,Buffer.from(signature,'base64'))}catch{}
  return {valid,reason:valid?'verified':'bad_signature'}
}

export function createNodeRecord({payload,publicKeyFingerprint,attestedAt=now()}={}){
  if(!payload?.node_id)throw new TypeError('attested payload required')
  const capacity=normalizeCapacity(payload.capacity)
  return {
    node_id:payload.node_id,
    state:'ATTESTED',
    hardware:clone(payload.hardware||{}),
    capacity,
    available_capacity:clone(capacity),
    network:clone(payload.network||{}),
    agent_version:payload.agent_version||null,
    public_key_fingerprint:publicKeyFingerprint||null,
    attested_at:attestedAt,
    last_heartbeat_at:attestedAt,
    health:'HEALTHY',
    workloads:[]
  }
}

export function normalizeCapacity(input={}){
  const cpu=Math.max(0,Number(input.cpu_cores||0))
  const memory=Math.max(0,Number(input.memory_mb||0))
  const storage=Math.max(0,Number(input.storage_gb||0))
  const gpu=Math.max(0,Number(input.gpu_count||0))
  return {cpu_cores:cpu,memory_mb:memory,storage_gb:storage,gpu_count:gpu}
}

export function applyHeartbeat(node,{health='HEALTHY',available_capacity,observedAt=now()}={}){
  return {...clone(node),health,last_heartbeat_at:observedAt,available_capacity:normalizeCapacity(available_capacity||node.available_capacity),state:health==='HEALTHY'?(node.state==='ATTESTED'?'ELIGIBLE':node.state):'DEGRADED'}
}

export function capacityFits(node,requirements={}){
  const a=node.available_capacity||{},r=normalizeCapacity(requirements)
  return Number(a.cpu_cores||0)>=r.cpu_cores&&Number(a.memory_mb||0)>=r.memory_mb&&Number(a.storage_gb||0)>=r.storage_gb&&Number(a.gpu_count||0)>=r.gpu_count
}

export function scheduleWorkload({workload,nodes=[],production=false,approved=false}={}){
  if(!workload?.workload_id)throw new TypeError('workload required')
  if(production&&!approved)return {status:'AWAITING_APPROVAL',workload_id:workload.workload_id,node_id:null}
  const eligible=nodes.filter(n=>['ATTESTED','ELIGIBLE'].includes(n.state)&&n.health==='HEALTHY'&&capacityFits(n,workload.requirements))
    .sort((a,b)=>(b.available_capacity?.memory_mb||0)-(a.available_capacity?.memory_mb||0))
  if(!eligible.length)return {status:'NO_ELIGIBLE_NODE',workload_id:workload.workload_id,node_id:null}
  const node=eligible[0]
  return {status:production?'AUTHORIZED_PLACEMENT':'SHADOW_PLACEMENT',workload_id:workload.workload_id,node_id:node.node_id}
}

export function buildClusterState(nodes=[]){
  const healthy=nodes.filter(n=>n.health==='HEALTHY').length
  const eligible=nodes.filter(n=>['ATTESTED','ELIGIBLE'].includes(n.state)&&n.health==='HEALTHY').length
  const totals=nodes.reduce((a,n)=>{const c=n.capacity||{};a.cpu_cores+=c.cpu_cores||0;a.memory_mb+=c.memory_mb||0;a.storage_gb+=c.storage_gb||0;a.gpu_count+=c.gpu_count||0;return a},{cpu_cores:0,memory_mb:0,storage_gb:0,gpu_count:0})
  return {nodes:nodes.length,healthy,eligible,capacity:totals,state:nodes.length===0?'EMPTY':healthy===nodes.length?'HEALTHY':healthy>0?'DEGRADED':'CRITICAL'}
}

export function publicEstateSnapshot({nodes=[]}={}){
  const cluster=buildClusterState(nodes)
  return {
    estate:'Global Vast Estate',
    designation:'Feodous Oprum Trust',
    compute_fabric:'NEO Compute Fabric',
    cluster,
    nodes:nodes.map(n=>({node_id:n.node_id,state:n.state,health:n.health,hardware:{arch:n.hardware?.arch||null,platform:n.hardware?.platform||null},capacity:n.capacity,last_heartbeat_at:n.last_heartbeat_at})),
    legal_boundary:'This software surface records operational trust/estate administration and compute state; it does not independently establish legal trust validity.'
  }
}
