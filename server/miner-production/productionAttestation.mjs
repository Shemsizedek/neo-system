export const ATTESTATION_SCHEMA='neo-miner-production-attestation/v1'

const REQUIRED_CHECKS=[
  'EDGE_HTTPS',
  'OPERATOR_HEALTH',
  'PRIVATE_BACKEND_READY',
  'ANONYMOUS_SESSION_BLOCKED',
  'AUTHENTICATED_SESSION',
  'SESSION_COOKIE_POLICY',
  'CSRF_ENFORCED',
  'RBAC_PROVEN',
  'TREASURY_READ',
  'HASHVAULT_READ',
  'SESSION_LOGOUT'
]

const cleanEvidence=value=>{
  if(value===undefined||value===null)return null
  if(typeof value==='string')return value.slice(0,256)
  if(typeof value==='number'||typeof value==='boolean')return value
  if(Array.isArray(value))return value.slice(0,20).map(cleanEvidence)
  if(typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>!/(password|secret|token|cookie|authorization|csrf)/i.test(key)).slice(0,20).map(([key,val])=>[key,cleanEvidence(val)]))
  return String(value).slice(0,256)
}

export function attestationCheck(id,ok,evidence=null,required=true){
  return {id:String(id),required:Boolean(required),state:ok?'GREEN':'BLOCKED',evidence:cleanEvidence(evidence)}
}

export function buildProductionAttestation({checks=[],operatorRole=null,operatorId=null,generatedAt=new Date().toISOString(),source='LIVE_OPERATOR_PROBE'}={}){
  const byId=new Map(checks.map(check=>[check.id,check]))
  const normalized=REQUIRED_CHECKS.map(id=>byId.get(id)||attestationCheck(id,false,{reason:'CHECK_NOT_REPORTED'}))
  for(const check of checks){if(!REQUIRED_CHECKS.includes(check.id))normalized.push(check)}
  const blocked=normalized.filter(check=>check.required&&check.state!=='GREEN')
  return {
    schema:ATTESTATION_SCHEMA,
    generatedAt,
    source,
    state:blocked.length===0?'GREEN':'BLOCKED',
    operator:operatorRole?{id:operatorId?String(operatorId):null,role:String(operatorRole)}:null,
    summary:{required:normalized.filter(v=>v.required).length,green:normalized.filter(v=>v.required&&v.state==='GREEN').length,blocked:blocked.length},
    checks:normalized
  }
}

export function assertGreenAttestation(attestation){
  if(attestation?.schema!==ATTESTATION_SCHEMA)throw new Error('ATTESTATION_SCHEMA_INVALID')
  if(attestation.state!=='GREEN')throw new Error(`PRODUCTION_ATTESTATION_BLOCKED_${attestation.summary?.blocked??'UNKNOWN'}`)
  return attestation
}
