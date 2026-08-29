import {createHmac,timingSafeEqual} from 'node:crypto'

export const RUNTIME_IDENTITY_SCHEMA='neo-miner-runtime-identity/v1'

const normalizeCommit=value=>String(value||'').trim().toLowerCase()
const normalizeDigest=value=>String(value||'').trim().toLowerCase()

export function runtimeIdentityFromEnv(env=process.env){
  return {
    schema:RUNTIME_IDENTITY_SCHEMA,
    buildCommitSha:normalizeCommit(env.NEO_BUILD_COMMIT_SHA),
    runtimeImageDigest:normalizeDigest(env.NEO_RUNTIME_IMAGE_DIGEST),
    authorizedCommitSha:normalizeCommit(env.NEO_AUTHORIZED_COMMIT_SHA),
    authorizedImageDigest:normalizeDigest(env.NEO_AUTHORIZED_IMAGE_DIGEST),
    environment:String(env.NEO_DEPLOYMENT_ENVIRONMENT||'neo-miner-production')
  }
}

export function evaluateRuntimeDrift(identity){
  const reasons=[]
  if(!/^[0-9a-f]{40}$/.test(identity.buildCommitSha))reasons.push('BUILD_COMMIT_MISSING_OR_INVALID')
  if(!/^sha256:[0-9a-f]{64}$/.test(identity.runtimeImageDigest))reasons.push('RUNTIME_IMAGE_DIGEST_MISSING_OR_INVALID')
  if(!/^[0-9a-f]{40}$/.test(identity.authorizedCommitSha))reasons.push('AUTHORIZED_COMMIT_MISSING_OR_INVALID')
  if(!/^sha256:[0-9a-f]{64}$/.test(identity.authorizedImageDigest))reasons.push('AUTHORIZED_IMAGE_DIGEST_MISSING_OR_INVALID')
  if(reasons.length===0&&identity.buildCommitSha!==identity.authorizedCommitSha)reasons.push('COMMIT_DRIFT')
  if(reasons.length===0&&identity.runtimeImageDigest!==identity.authorizedImageDigest)reasons.push('IMAGE_DRIFT')
  return {state:reasons.length===0?'GREEN':'DRIFT',holdFinancialMutations:reasons.length>0,reasons}
}

export function buildRuntimeAttestation({identity=runtimeIdentityFromEnv(),generatedAt=new Date().toISOString(),secret=process.env.NEO_RUNTIME_ATTESTATION_SECRET}={}){
  const drift=evaluateRuntimeDrift(identity)
  const payload={schema:RUNTIME_IDENTITY_SCHEMA,generatedAt,identity,drift}
  if(!secret)return {...payload,signature:null,drift:{...drift,state:'DRIFT',holdFinancialMutations:true,reasons:[...new Set([...drift.reasons,'ATTESTATION_SECRET_MISSING'])]}}
  const value=createHmac('sha256',String(secret)).update(JSON.stringify(payload)).digest('hex')
  return {...payload,signature:{algorithm:'HMAC-SHA256',value}}
}

export function verifyRuntimeAttestation(document,{secret,expectedCommitSha,expectedImageDigest}={}){
  if(document?.schema!==RUNTIME_IDENTITY_SCHEMA)throw new Error('RUNTIME_IDENTITY_SCHEMA_INVALID')
  if(!secret)throw new Error('RUNTIME_ATTESTATION_SECRET_REQUIRED')
  const {signature,...payload}=document
  if(signature?.algorithm!=='HMAC-SHA256'||!/^[0-9a-f]{64}$/i.test(String(signature?.value||'')))throw new Error('RUNTIME_ATTESTATION_SIGNATURE_INVALID')
  const expected=createHmac('sha256',String(secret)).update(JSON.stringify(payload)).digest('hex')
  const supplied=String(signature.value).toLowerCase()
  if(!timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(supplied,'hex')))throw new Error('RUNTIME_ATTESTATION_SIGNATURE_INVALID')
  if(payload.drift?.state!=='GREEN'||payload.drift?.holdFinancialMutations)throw new Error('RUNTIME_DRIFT_ACTIVE')
  if(expectedCommitSha&&payload.identity?.buildCommitSha!==normalizeCommit(expectedCommitSha))throw new Error('RUNTIME_COMMIT_MISMATCH')
  if(expectedImageDigest&&payload.identity?.runtimeImageDigest!==normalizeDigest(expectedImageDigest))throw new Error('RUNTIME_IMAGE_MISMATCH')
  return payload
}

export function isFinancialMutation(method,url=''){
  if(String(method).toUpperCase()!=='POST')return false
  return /^\/(payouts(?:\/|$)|hashvault\/(?:credits|payouts\/reconcile)(?:\/|$)|incidents\/[^/]+\/resolve$)/.test(String(url).split('?')[0])
}
