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

export function assertGreenAttestation(attestation,{maxAgeMs=30*60*1000,now=Date.now()}={}){
  if(attestation?.schema!==ATTESTATION_SCHEMA)throw new Error('ATTESTATION_SCHEMA_INVALID')
  if(attestation.state!=='GREEN')throw new Error(`PRODUCTION_ATTESTATION_BLOCKED_${attestation.summary?.blocked??'UNKNOWN'}`)
  
  // Validate required structural fields that buildProductionAttestation produces
  if(typeof attestation.generatedAt!=='string'||!attestation.generatedAt)throw new Error('ATTESTATION_GENERATED_AT_REQUIRED')
  const generatedTime=Date.parse(attestation.generatedAt)
  if(!Number.isFinite(generatedTime))throw new Error('ATTESTATION_GENERATED_AT_INVALID')
  
  // Validate freshness to prevent replay attacks with old GREEN attestations
  const age=now-generatedTime
  if(!Number.isFinite(age)||age<0||age>maxAgeMs)throw new Error('ATTESTATION_STALE_OR_FUTURE')
  
  // Validate source field exists (should be 'LIVE_OPERATOR_PROBE' or similar)
  if(typeof attestation.source!=='string'||!attestation.source)throw new Error('ATTESTATION_SOURCE_REQUIRED')
  
  // Validate operator identity is present
  if(!attestation.operator||typeof attestation.operator!=='object')throw new Error('ATTESTATION_OPERATOR_REQUIRED')
  if(typeof attestation.operator.role!=='string'||!attestation.operator.role)throw new Error('ATTESTATION_OPERATOR_ROLE_REQUIRED')
  
  // Validate summary structure and consistency
  if(!attestation.summary||typeof attestation.summary!=='object')throw new Error('ATTESTATION_SUMMARY_REQUIRED')
  if(typeof attestation.summary.required!=='number'||attestation.summary.required<REQUIRED_CHECKS.length)throw new Error('ATTESTATION_SUMMARY_REQUIRED_INVALID')
  if(typeof attestation.summary.green!=='number'||attestation.summary.green<REQUIRED_CHECKS.length)throw new Error('ATTESTATION_SUMMARY_GREEN_INVALID')
  if(typeof attestation.summary.blocked!=='number'||attestation.summary.blocked!==0)throw new Error('ATTESTATION_SUMMARY_BLOCKED_MUST_BE_ZERO')
  
  // Validate checks array contains all required checks in GREEN state
  if(!Array.isArray(attestation.checks)||attestation.checks.length<REQUIRED_CHECKS.length)throw new Error('ATTESTATION_CHECKS_INCOMPLETE')
  const checkMap=new Map(attestation.checks.map(check=>[check.id,check]))
  for(const requiredId of REQUIRED_CHECKS){
    const check=checkMap.get(requiredId)
    if(!check)throw new Error(`ATTESTATION_REQUIRED_CHECK_MISSING_${requiredId}`)
    if(check.state!=='GREEN')throw new Error(`ATTESTATION_REQUIRED_CHECK_NOT_GREEN_${requiredId}`)
    if(check.required!==true)throw new Error(`ATTESTATION_REQUIRED_CHECK_NOT_MARKED_REQUIRED_${requiredId}`)
  }
  
  return attestation
}
