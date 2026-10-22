import crypto from 'node:crypto'

const clone=v=>structuredClone(v)
const now=()=>new Date().toISOString()
const ip4=n=>`10.144.${Math.floor(n/254)%254+1}.${n%254+1}`

export function fingerprintPublicKey(value){
  if(!value)throw new TypeError('public key required')
  return crypto.createHash('sha256').update(String(value)).digest('hex')
}

export function createNetworkRegistry({dnsSuffix='estate.neo'}={}){
  const nodes=new Map(),services=new Map()
  let nextIp=1
  return {
    enrollNode(input={}){
      if(!input.node_id||!input.public_key||!input.attested)throw new Error('attested_node_identity_required')
      if(nodes.has(input.node_id))throw new Error('node_already_enrolled')
      const overlay_ip=input.overlay_ip||ip4(nextIp++)
      if([...nodes.values()].some(n=>n.overlay_ip===overlay_ip))throw new Error('overlay_ip_conflict')
      const node={
        node_id:String(input.node_id),
        overlay_ip,
        public_key_fingerprint:fingerprintPublicKey(input.public_key),
        endpoint:input.endpoint||null,
        provider:input.provider||'neo-owned',
        region:input.region||null,
        state:'ELIGIBLE',
        health:'HEALTHY',
        last_seen_at:now(),
        services:[]
      }
      nodes.set(node.node_id,node)
      return clone(node)
    },
    heartbeat(nodeId,{health='HEALTHY',endpoint}={}){
      const node=nodes.get(nodeId);if(!node)throw new Error('node_not_found')
      node.health=health
      node.state=health==='HEALTHY'?'ELIGIBLE':'DEGRADED'
      if(endpoint)node.endpoint=endpoint
      node.last_seen_at=now()
      return clone(node)
    },
    quarantine(nodeId,reason='policy'){
      const node=nodes.get(nodeId);if(!node)throw new Error('node_not_found')
      node.state='QUARANTINED';node.health='UNHEALTHY';node.quarantine_reason=reason
      return clone(node)
    },
    registerService(input={}){
      if(!input.service_id||!input.node_id||!input.port)throw new Error('service_id_node_id_port_required')
      const node=nodes.get(input.node_id);if(!node)throw new Error('node_not_found')
      if(node.state!=='ELIGIBLE'||node.health!=='HEALTHY')throw new Error('node_not_eligible')
      const row={
        service_id:String(input.service_id),
        node_id:node.node_id,
        name:`${String(input.service_id).replace(/[^a-z0-9-]/gi,'-').toLowerCase()}.${dnsSuffix}`,
        overlay_ip:node.overlay_ip,
        port:Number(input.port),
        protocol:input.protocol||'https',
        health_path:input.health_path||'/health',
        priority:Number(input.priority||100),
        registered_at:now()
      }
      const rows=services.get(row.service_id)||[]
      services.set(row.service_id,[...rows.filter(x=>x.node_id!==row.node_id),row])
      if(!node.services.includes(row.service_id))node.services.push(row.service_id)
      return clone(row)
    },
    resolveService(serviceId){
      const rows=(services.get(serviceId)||[])
        .filter(r=>{const n=nodes.get(r.node_id);return n?.state==='ELIGIBLE'&&n?.health==='HEALTHY'})
        .sort((a,b)=>a.priority-b.priority||a.node_id.localeCompare(b.node_id))
      const selected=rows[0]||null
      return {
        service_id:serviceId,
        state:selected?'RESOLVED':'UNAVAILABLE',
        selected:clone(selected),
        candidates:clone(rows)
      }
    },
    node(id){return clone(nodes.get(id)||null)},
    nodes(){return [...nodes.values()].map(clone)},
    services(){return [...services.values()].flat().map(clone)}
  }
}

export function buildPeerPlan(nodes=[]){
  const eligible=nodes.filter(n=>n.state==='ELIGIBLE'&&n.health==='HEALTHY')
  return eligible.map(node=>({
    node_id:node.node_id,
    address:`${node.overlay_ip}/32`,
    public_key_fingerprint:node.public_key_fingerprint,
    endpoint:node.endpoint,
    peers:eligible.filter(p=>p.node_id!==node.node_id).map(p=>({
      node_id:p.node_id,
      allowed_ips:[`${p.overlay_ip}/32`],
      endpoint:p.endpoint,
      public_key_fingerprint:p.public_key_fingerprint
    }))
  }))
}

export function buildDnsZone({services=[],suffix='estate.neo'}={}){
  const records=[]
  for(const s of services){
    if(!s.name.endsWith(suffix))continue
    records.push({name:s.name,type:'A',value:s.overlay_ip,ttl:30,service_id:s.service_id,node_id:s.node_id})
  }
  return {suffix,records}
}

export function routeWithFailover({serviceId,registry,failedNodeId}={}){
  if(failedNodeId)registry.heartbeat(failedNodeId,{health:'UNHEALTHY'})
  const resolution=registry.resolveService(serviceId)
  return {
    service_id:serviceId,
    failover: Boolean(failedNodeId),
    route_state:resolution.state,
    selected:resolution.selected,
    candidates:resolution.candidates
  }
}

export function networkSnapshot(registry){
  const nodes=registry.nodes(),services=registry.services()
  return {
    estate:'Global Vast Estate',
    fabric:'NEO Sovereign Network',
    node_count:nodes.length,
    healthy_nodes:nodes.filter(x=>x.health==='HEALTHY').length,
    service_endpoints:services.length,
    dns:buildDnsZone({services}),
    peer_plan:buildPeerPlan(nodes),
    generated_at:now()
  }
}


export function renderWireGuardConfig({node,peerPlan,privateKeyRef='NEO_NODE_WIREGUARD_PRIVATE_KEY',listenPort=51820}={}){
  if(!node?.overlay_ip)throw new TypeError('node required')
  const plan=(peerPlan||[]).find(x=>x.node_id===node.node_id)
  if(!plan)throw new Error('peer_plan_missing')
  const lines=[
    '[Interface]',
    `Address = ${node.overlay_ip}/32`,
    `ListenPort = ${Number(listenPort)}`,
    `PrivateKey = <runtime-secret:${privateKeyRef}>`,
    ''
  ]
  for(const peer of plan.peers){
    lines.push('[Peer]')
    lines.push(`# Node: ${peer.node_id}; expected fingerprint: ${peer.public_key_fingerprint}`)
    lines.push('PublicKey = <resolved-from-attested-node-registry>')
    if(peer.endpoint)lines.push(`Endpoint = ${peer.endpoint}`)
    lines.push(`AllowedIPs = ${peer.allowed_ips.join(', ')}`)
    lines.push('PersistentKeepalive = 25')
    lines.push('')
  }
  return lines.join('\n')
}
