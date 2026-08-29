import {createHash,createHmac,timingSafeEqual} from 'node:crypto'
import {ATTESTATION_SCHEMA,assertGreenAttestation} from './productionAttestation.mjs'

export const RELEASE_ATTESTATION_SCHEMA='neo-miner-release-attestation/v1'

const canonical=value=>{
  if(value===null||typeof value!=='object')return JSON.stringify(value)
  if(Array.isArray(value))return `[${value.map(canonical).join(',')}]`
  return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`
}

export const sha256=value=>createHash('sha256').update(typeof value==='string'?value:canonical(value)).digest('hex')

export function buildReleaseAttestation({attestation,commitSha,imageDigest,environment='neo-miner-production',generatedAt=new Date().toISOString()}={}){
  assertGreenAttestation(attestation)
  if(!/^[0-9a-f]{40}$/i.test(String(commitSha||'')))throw new Error('RELEASE_COMMIT_SHA_INVALID')
  if(!/^sha256:[0-9a-f]{64}$/i.test(String(imageDigest||'')))throw new Error('RELEASE_IMAGE_DIGEST_INVALID')
  const payload={
    schema:RELEASE_ATTESTATION_SCHEMA,
    generatedAt,
    environment:String(environment),
    commitSha:String(commitSha).toLowerCase(),
    imageDigest:String(imageDigest).toLowerCase(),
    productionAttestation:{schema:ATTESTATION_SCHEMA,digest:`sha256:${sha256(attestation)}`,generatedAt:attestation.generatedAt,state:attestation.state,summary:attestation.summary}
  }
  return payload
}

export function signReleaseAttestation(payload,secret){
  if(!secret)throw new Error('RELEASE_ATTESTATION_SIGNING_SECRET_REQUIRED')
  const signature=createHmac('sha256',String(secret)).update(canonical(payload)).digest('hex')
  return {...payload,signature:{algorithm:'HMAC-SHA256',value:signature}}
}

export function verifyReleaseAttestation(document,{secret,expectedCommitSha,expectedImageDigest,maxAgeMs=30*60*1000,now=Date.now()}={}){
  if(document?.schema!==RELEASE_ATTESTATION_SCHEMA)throw new Error('RELEASE_ATTESTATION_SCHEMA_INVALID')
  if(!secret)throw new Error('RELEASE_ATTESTATION_SIGNING_SECRET_REQUIRED')
  const {signature,...payload}=document
  if(signature?.algorithm!=='HMAC-SHA256'||!/^[0-9a-f]{64}$/i.test(String(signature?.value||'')))throw new Error('RELEASE_ATTESTATION_SIGNATURE_INVALID')
  const expected=createHmac('sha256',String(secret)).update(canonical(payload)).digest('hex')
  const supplied=String(signature.value).toLowerCase()
  if(!timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(supplied,'hex')))throw new Error('RELEASE_ATTESTATION_SIGNATURE_INVALID')
  if(expectedCommitSha&&payload.commitSha!==String(expectedCommitSha).toLowerCase())throw new Error('RELEASE_ATTESTATION_COMMIT_MISMATCH')
  if(expectedImageDigest&&payload.imageDigest!==String(expectedImageDigest).toLowerCase())throw new Error('RELEASE_ATTESTATION_IMAGE_MISMATCH')
  const age=now-Date.parse(payload.generatedAt)
  if(!Number.isFinite(age)||age<0||age>maxAgeMs)throw new Error('RELEASE_ATTESTATION_STALE')
  if(payload.productionAttestation?.state!=='GREEN')throw new Error('RELEASE_ATTESTATION_NOT_GREEN')
  return payload
}
