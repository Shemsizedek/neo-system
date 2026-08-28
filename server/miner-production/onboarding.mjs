import crypto from 'node:crypto'

const ALLOWED_TYPES=new Set(['BITCOIN_RPC','COUNTERPARTY_API','STRATUM_POOL','MINER_AGENT','FX_PROVIDER','PAYMENT_PROVIDER'])
const HTTPS_TYPES=new Set(['COUNTERPARTY_API','FX_PROVIDER','PAYMENT_PROVIDER','MINER_AGENT'])

export function createInfrastructureRecord(input={}){
  if(!ALLOWED_TYPES.has(input.type)) throw new Error('UNSUPPORTED_INFRASTRUCTURE_TYPE')
  if(!input.name) throw new Error('NAME_REQUIRED')
  if(!input.endpoint) throw new Error('ENDPOINT_REQUIRED')
  if(HTTPS_TYPES.has(input.type)&&!String(input.endpoint).startsWith('https://')) throw new Error('HTTPS_REQUIRED')
  if(input.type==='STRATUM_POOL'&&!/^stratum(\+tcp|\+ssl)?:\/\//.test(input.endpoint)) throw new Error('STRATUM_ENDPOINT_REQUIRED')
  if(input.type==='BITCOIN_RPC'&&!/^https?:\/\/(127\.0\.0\.1|localhost|\[[^\]]+\]|[^/]+)/.test(input.endpoint)) throw new Error('BITCOIN_RPC_ENDPOINT_INVALID')
  return {
    id:`INF-${crypto.randomUUID()}`,
    type:input.type,
    name:String(input.name),
    endpoint:String(input.endpoint),
    secretRef:input.secretRef?String(input.secretRef):null,
    fingerprint:input.fingerprint?String(input.fingerprint):null,
    metadata:input.metadata||{},
    state:'REGISTERED',
    verifiedAt:null,
    lastProbe:null,
    createdAt:new Date().toISOString()
  }
}

export function markInfrastructureVerified(record,probe={}){
  if(!record||record.state!=='REGISTERED') throw new Error('INFRASTRUCTURE_NOT_REGISTERED')
  if(probe.ok!==true) throw new Error('PROBE_NOT_VERIFIED')
  return {...record,state:'VERIFIED',verifiedAt:new Date().toISOString(),lastProbe:{ok:true,detail:probe.detail||'verified',at:new Date().toISOString()}}
}

export function infrastructureIsGreen(record){
  return Boolean(record?.state==='VERIFIED'&&record?.lastProbe?.ok===true)
}

export function onboardingSummary(records=[]){
  const required=['BITCOIN_RPC','COUNTERPARTY_API','STRATUM_POOL','MINER_AGENT','FX_PROVIDER','PAYMENT_PROVIDER']
  const byType=Object.fromEntries(required.map(type=>[type,records.filter(r=>r.type===type)]))
  const gates=required.map(type=>({type,green:byType[type].some(infrastructureIsGreen),count:byType[type].length,verified:byType[type].filter(infrastructureIsGreen).length}))
  return {ready:gates.every(g=>g.green),gates,total:records.length,generatedAt:new Date().toISOString()}
}
