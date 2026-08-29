import {createHmac,timingSafeEqual} from 'node:crypto'
import {sha256,verifyReleaseAttestation} from './releasePromotion.mjs'

export const DEPLOYMENT_PROVENANCE_SCHEMA='neo-miner-deployment-provenance/v1'
export const DEPLOYMENT_ACTIONS=Object.freeze({DEPLOY:'DEPLOY',ROLLBACK:'ROLLBACK'})

const canonical=value=>{
  if(value===null||typeof value!=='object')return JSON.stringify(value)
  if(Array.isArray(value))return `[${value.map(canonical).join(',')}]`
  return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`
}

const validCommit=value=>/^[0-9a-f]{40}$/i.test(String(value||''))
const validDigest=value=>/^sha256:[0-9a-f]{64}$/i.test(String(value||''))

export function buildDeploymentRecord({releaseAttestation,releaseSecret,observedCommitSha,observedImageDigest,action='DEPLOY',outcome='DEPLOYED',previousRecord=null,deployedAt=new Date().toISOString(),environment='neo-miner-production'}={}){
  const release=verifyReleaseAttestation(releaseAttestation,{secret:releaseSecret,expectedCommitSha:observedCommitSha,expectedImageDigest:observedImageDigest,maxAgeMs:Number.MAX_SAFE_INTEGER})
  if(!Object.values(DEPLOYMENT_ACTIONS).includes(action))throw new Error('DEPLOYMENT_ACTION_INVALID')
  if(outcome!=='DEPLOYED')throw new Error('DEPLOYMENT_OUTCOME_NOT_DEPLOYED')
  if(!validCommit(observedCommitSha))throw new Error('DEPLOYMENT_COMMIT_SHA_INVALID')
  if(!validDigest(observedImageDigest))throw new Error('DEPLOYMENT_IMAGE_DIGEST_INVALID')
  const previousDigest=previousRecord?`sha256:${sha256(previousRecord)}`:null
  return {
    schema:DEPLOYMENT_PROVENANCE_SCHEMA,
    environment:String(environment),
    action,
    outcome,
    deployedAt,
    release:{commitSha:release.commitSha,imageDigest:release.imageDigest,attestationDigest:`sha256:${sha256(releaseAttestation)}`},
    observed:{commitSha:String(observedCommitSha).toLowerCase(),imageDigest:String(observedImageDigest).toLowerCase()},
    previousRecordDigest:previousDigest
  }
}

export function signDeploymentRecord(record,secret){
  if(!secret)throw new Error('DEPLOYMENT_PROVENANCE_SIGNING_SECRET_REQUIRED')
  const signature=createHmac('sha256',String(secret)).update(canonical(record)).digest('hex')
  return {...record,signature:{algorithm:'HMAC-SHA256',value:signature}}
}

export function verifyDeploymentRecord(document,{secret,previousRecord=null}={}){
  if(document?.schema!==DEPLOYMENT_PROVENANCE_SCHEMA)throw new Error('DEPLOYMENT_PROVENANCE_SCHEMA_INVALID')
  if(!secret)throw new Error('DEPLOYMENT_PROVENANCE_SIGNING_SECRET_REQUIRED')
  const {signature,...record}=document
  if(signature?.algorithm!=='HMAC-SHA256'||!/^[0-9a-f]{64}$/i.test(String(signature?.value||'')))throw new Error('DEPLOYMENT_PROVENANCE_SIGNATURE_INVALID')
  const expected=createHmac('sha256',String(secret)).update(canonical(record)).digest('hex')
  if(!timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(String(signature.value).toLowerCase(),'hex')))throw new Error('DEPLOYMENT_PROVENANCE_SIGNATURE_INVALID')
  const expectedPrevious=previousRecord?`sha256:${sha256(previousRecord)}`:null
  if(record.previousRecordDigest!==expectedPrevious)throw new Error('DEPLOYMENT_PROVENANCE_CHAIN_INVALID')
  if(record.release?.commitSha!==record.observed?.commitSha||record.release?.imageDigest!==record.observed?.imageDigest)throw new Error('DEPLOYMENT_PROVENANCE_RUNTIME_MISMATCH')
  if(record.outcome!=='DEPLOYED')throw new Error('DEPLOYMENT_PROVENANCE_NOT_DEPLOYED')
  return record
}

export function authorizeRollback({targetCommitSha,targetImageDigest,history=[],provenanceSecret,currentCommitSha=null,currentImageDigest=null}={}){
  if(!validCommit(targetCommitSha)||!validDigest(targetImageDigest))throw new Error('ROLLBACK_TARGET_IDENTITY_INVALID')
  const commit=String(targetCommitSha).toLowerCase(),image=String(targetImageDigest).toLowerCase()
  if(currentCommitSha&&currentImageDigest&&commit===String(currentCommitSha).toLowerCase()&&image===String(currentImageDigest).toLowerCase())throw new Error('ROLLBACK_TARGET_ALREADY_CURRENT')
  let previous=null,matched=null
  for(const document of history){
    const record=verifyDeploymentRecord(document,{secret:provenanceSecret,previousRecord:previous})
    if(record.observed.commitSha===commit&&record.observed.imageDigest===image)matched=record
    previous=document
  }
  if(!matched)throw new Error('ROLLBACK_TARGET_NOT_PREVIOUSLY_DEPLOYED')
  return {authorized:true,target:{commitSha:commit,imageDigest:image},priorDeployment:{deployedAt:matched.deployedAt,action:matched.action,attestationDigest:matched.release.attestationDigest}}
}
