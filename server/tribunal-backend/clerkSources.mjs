import {normalizeClerkIntake,findClerkDuplicate} from './clerkIntake.mjs'

const text=value=>String(value??'').trim()
const shaPattern=/^[a-f0-9]{64}$/i

/**
 * Adapt the existing moderated public intake receipt. This never promotes a
 * filing or grants jurisdiction. Only receipt metadata enters this adapter.
 */
export function fromPublicIntakeReceipt(receipt){
 if(!receipt||!text(receipt.intakeId)||!text(receipt.receiptCode))throw new Error('Verified public intake receipt required')
 if(!shaPattern.test(text(receipt.payloadHash)))throw new Error('Valid payload hash required')
 if(text(receipt.status)!=='PENDING_REVIEW')throw new Error('Expected pending review receipt')
 return normalizeClerkIntake({
   channel:'public_efile',sourceId:receipt.intakeId,receiptCode:receipt.receiptCode,
   receivedAt:receipt.receivedAt,attachmentHashes:[]
 })
}

/**
 * Designated court mailbox metadata only. Do not ingest arbitrary Gmail or
 * personal email. The message body and attachments stay in protected storage.
 */
export function fromDesignatedCourtEmail(message,{allowedMailbox}={}){
 if(!allowedMailbox||!message||text(message.mailbox).toLowerCase()!==text(allowedMailbox).toLowerCase())throw new Error('Court mailbox not authorized')
 const messageId=text(message.providerMessageId)
 if(!messageId)throw new Error('Immutable provider message ID required')
 return normalizeClerkIntake({
  channel:'court_email',sourceId:messageId,receivedAt:message.receivedAt,
  existingClaimNo:message.existingClaimNo,attachmentHashes:message.attachmentHashes||[]
 })
}

/**
 * WordPress connector mapping requires a verified submission identifier,
 * never an inferred post title or form field. No direct case creation.
 */
export function fromWordPressSubmission(submission,{allowedSite,allowedFormIds=[]}={}){
 if(!allowedSite||text(submission?.site).toLowerCase()!==text(allowedSite).toLowerCase())throw new Error('WordPress site not authorized')
 if(!allowedFormIds.map(String).includes(text(submission.formId)))throw new Error('WordPress form not authorized')
 if(!text(submission.submissionId))throw new Error('WordPress submission ID required')
 return normalizeClerkIntake({
  channel:'wordpress_form',
  sourceId:[submission.site,submission.formId,submission.submissionId].map(text).join(':'),
  receivedAt:submission.receivedAt,receiptCode:submission.receiptCode,
  attachmentHashes:submission.attachmentHashes||[]
 })
}

export function triageClerkCandidates(incoming,existing=[]){
 if(!Array.isArray(incoming)||!Array.isArray(existing))throw new Error('Candidate arrays required')
 const accepted=[...existing],newCandidates=[],duplicates=[]
 for(const candidate of incoming){
  const prior=findClerkDuplicate(candidate,accepted)
  if(prior)duplicates.push({sourceKey:candidate.sourceKey,existingSourceKey:prior.sourceKey})
  else{accepted.push(candidate);newCandidates.push(candidate)}
 }
 return {newCandidates,duplicates}
}
