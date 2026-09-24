import { buildCommonPlatformJobs } from './neo-social-campaign-pipeline.mjs'
import { dispatchSocialJob } from './neo-social-dispatcher.mjs'

function keyFor(job, accountId) {
  if (!accountId) throw new Error(`account_id_required:${job.destination}`)
  return `${job.idempotencyKey}:${accountId}`
}

export async function runApprovedCampaign(payload, runtime, store, {
  approvalGranted = false,
  env = process.env,
  providerOrder,
  resolveAccounts,
} = {}) {
  if (approvalGranted !== true) throw new Error('publication_approval_required')
  if (!store || typeof store.claim !== 'function' || typeof store.getReceipt !== 'function' || typeof store.saveReceipt !== 'function') throw new Error('receipt_store_required')
  if (typeof resolveAccounts !== 'function') throw new Error('resolve_accounts_required')

  const jobs = buildCommonPlatformJobs(payload,{env})
  const receipts=[]

  for (const job of jobs) {
    const accounts=await resolveAccounts(job.destination,payload)
    if (!Array.isArray(accounts) || accounts.length===0) throw new Error(`no_accounts_resolved:${job.destination}`)

    for (const account of accounts) {
      const accountId=String(account?.accountId||'').trim()
      const idempotencyKey=keyFor(job,accountId)
      const existing=await store.getReceipt(idempotencyKey,job.destination)
      if (existing) { receipts.push({...existing,replayed:true}); continue }

      const claimed=await store.claim(idempotencyKey,job.destination)
      if (!claimed) {
        receipts.push({destination:job.destination,accountId,contentId:job.contentId,status:'uncertain-inflight',published:false,replayed:true})
        continue
      }

      let receipt
      try {
        const result=await dispatchSocialJob({...job,accountId,account},runtime,{providerOrder})
        receipt={...result,idempotencyKey,contentLane:job.contentLane,accountId,replayed:false,recordedAt:new Date().toISOString()}
      } catch(error) {
        receipt={schema:'neo.social.dispatch-receipt.v0.1',destination:job.destination,accountId,contentId:job.contentId,sourceVersion:job.sourceVersion,status:'failed',platformPostId:null,url:null,verification:'provider-failure',idempotencyKey,contentLane:job.contentLane,error:error instanceof Error?error.message:'unknown',replayed:false,recordedAt:new Date().toISOString()}
      }
      await store.saveReceipt(idempotencyKey,job.destination,receipt)
      receipts.push(receipt)
    }
  }

  return {schema:'neo.social.campaign-run.v0.1',contentLane:payload.contentLane,contentId:payload.contentId,receipts}
}
