import crypto from 'node:crypto'

const now=()=>new Date().toISOString()

export function buildMiningJob({poolId,template,extranonce1='00000000',extranonce2Size=4,target=null}={}){
  if(!poolId) throw new Error('POOL_ID_REQUIRED')
  if(!template?.templateId||!template.previousBlockHash) throw new Error('BLOCK_TEMPLATE_REQUIRED')
  return Object.freeze({
    jobId:`job_${crypto.randomUUID()}`,
    poolId,
    templateId:template.templateId,
    height:template.height,
    previousBlockHash:template.previousBlockHash,
    bits:template.bits,
    version:template.version,
    curtime:template.curtime,
    extranonce1,
    extranonce2Size:Number(extranonce2Size),
    target,
    cleanJobs:true,
    issuedAt:now(),
    transport:'STRATUM_BOUNDARY'
  })
}

export function validateShareSubmission({job,workerId,nonce,ntime,extranonce2,difficulty,proofHash}={}){
  if(!job?.jobId) throw new Error('JOB_REQUIRED')
  if(!workerId) throw new Error('WORKER_REQUIRED')
  if(!nonce||!ntime||!extranonce2) throw new Error('SHARE_FIELDS_REQUIRED')
  if(!(Number(difficulty)>0)) throw new Error('INVALID_DIFFICULTY')
  if(proofHash&&!/^[0-9a-f]{64}$/i.test(proofHash)) throw new Error('INVALID_PROOF_HASH')
  return Object.freeze({
    submissionId:`sub_${crypto.randomUUID()}`,
    jobId:job.jobId,
    templateId:job.templateId,
    workerId,
    nonce,
    ntime,
    extranonce2,
    difficulty:String(difficulty),
    proofHash:proofHash||null,
    receivedAt:now(),
    verified:false,
    accepted:false
  })
}

export function classifyVerifiedShare(submission,{meetsShareTarget=false,meetsNetworkTarget=false,computedHash=null}={}){
  if(!submission?.submissionId) throw new Error('SUBMISSION_REQUIRED')
  if(computedHash&&!/^[0-9a-f]{64}$/i.test(computedHash)) throw new Error('INVALID_COMPUTED_HASH')
  return Object.freeze({...submission,verified:true,accepted:Boolean(meetsShareTarget),blockCandidate:Boolean(meetsNetworkTarget),computedHash:computedHash||submission.proofHash||null,verifiedAt:now()})
}
