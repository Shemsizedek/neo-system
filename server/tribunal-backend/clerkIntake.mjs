import {createHash} from 'node:crypto'

const CHANNELS=new Set(['public_efile','court_email','wordpress_form','clerk_entry'])
const sha256=value=>createHash('sha256').update(value).digest('hex')
const normalized=value=>String(value??'').trim()
const bounded=(value,max,field)=>{
  const text=normalized(value)
  if(text.length>max)throw new Error(field+' exceeds maximum length')
  return text
}

/**
 * Produce an administrative intake candidate, never an accepted case or filing.
 * Do not put case contents or personally identifiable information into GitHub,
 * Bitcoin broadcasts, logs, or unapproved external services.
 */
export function normalizeClerkIntake(input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Invalid intake')
  const channel=normalized(input.channel)
  if(!CHANNELS.has(channel))throw new Error('Unsupported intake channel')
  const sourceId=bounded(input.sourceId,256,'sourceId')
  if(!sourceId)throw new Error('Source identifier required')
  const receivedAt=normalized(input.receivedAt)
  if(!receivedAt||!Number.isFinite(Date.parse(receivedAt))||!/^\\d{4}-\\d{2}-\\d{2}T/.test(receivedAt))throw new Error('Valid ISO receivedAt required')
  const receiptCode=bounded(input.receiptCode,120,'receiptCode')
  const existingClaimNo=bounded(input.existingClaimNo,120,'existingClaimNo')
  const attachmentHashes=input.attachmentHashes??[]
  if(!Array.isArray(attachmentHashes)||attachmentHashes.length>100||attachmentHashes.some(hash=>typeof hash!=='string'||! /^[a-f0-9]{64}$/i.test(hash)))throw new Error('Invalid attachment hash list')
  const sourceKey=sha256(JSON.stringify([channel,sourceId]))
  return Object.freeze({
    status:'PENDING_REVIEW',
    sourceChannel:channel,
    sourceId,
    sourceKey,
    receivedAt:new Date(receivedAt).toISOString(),
    receiptCode:receiptCode||null,
    existingClaimNo:existingClaimNo||null,
    attachmentHashes:[...new Set(attachmentHashes.map(hash=>hash.toLowerCase()))],
    requiresReview:true,
    authoritativeCase:false
  })
}

/** Match known immutable identifiers only; never infer identity from party names. */
export function findClerkDuplicate(candidate,records){
  if(!Array.isArray(records))throw new Error('Records must be an array')
  return records.find(record=>
    record.sourceKey===candidate.sourceKey||
    (candidate.receiptCode&&record.receiptCode===candidate.receiptCode)
  )??null
}

/** Manifest hashes only. Actual Bitcoin broadcasting is a separate approved step. */
export function prepareClerkAnchor({caseNo,eventId,documentHashes}){
  if(!caseNo||!eventId||!Array.isArray(documentHashes)||documentHashes.some(hash=>! /^[a-f0-9]{64}$/i.test(hash)))throw new Error('Invalid anchor manifest')
  const manifest={schema:'neo-tribunal-anchor-v1',caseNo:bounded(caseNo,120,'caseNo'),eventId:bounded(eventId,120,'eventId'),documentHashes:[...new Set(documentHashes.map(hash=>hash.toLowerCase()))].sort()}
  return {manifest,manifestHash:sha256(JSON.stringify(manifest)),status:'PREPARED_NOT_BROADCAST'}
}
