import test from 'node:test'
import assert from 'node:assert/strict'
import {normalizeClerkIntake,findClerkDuplicate,prepareClerkAnchor} from './clerkIntake.mjs'

const base={channel:'court_email',sourceId:'message-123',receivedAt:'2026-11-20T12:00:00Z'}
test('normalizes to a pending review candidate with deterministic source key',()=>{
 const a=normalizeClerkIntake(base),b=normalizeClerkIntake(base)
 assert.equal(a.status,'PENDING_REVIEW')
 assert.equal(a.authoritativeCase,false)
 assert.equal(a.sourceKey,b.sourceKey)
 assert.equal(findClerkDuplicate(a,[b]),b)
})
test('deduplicates by verified receipt, not names or attachments',()=>{
 const a=normalizeClerkIntake({...base,receiptCode:'WIC-1'})
 const b=normalizeClerkIntake({...base,channel:'public_efile',sourceId:'form-2',receiptCode:'WIC-1'})
 assert.equal(findClerkDuplicate(b,[a]),a)
 assert.equal(findClerkDuplicate(normalizeClerkIntake({...base,sourceId:'other'}),[a]),null)
})
test('rejects unknown channels, missing IDs, invalid timestamps and hashes',()=>{
 assert.throws(()=>normalizeClerkIntake({...base,channel:'unknown'}))
 assert.throws(()=>normalizeClerkIntake({...base,sourceId:''}))
 assert.throws(()=>normalizeClerkIntake({...base,receivedAt:'tomorrow'}))
 assert.throws(()=>normalizeClerkIntake({...base,attachmentHashes:['bad']}))
})
test('anchor manifest never claims broadcast or confirmation',()=>{
 const result=prepareClerkAnchor({caseNo:'WIC-CASE-1',eventId:'evt-1',documentHashes:['a'.repeat(64)]})
 assert.equal(result.status,'PREPARED_NOT_BROADCAST')
 assert.match(result.manifestHash,/^[a-f0-9]{64}$/)
 assert.equal('txid' in result,false)
})
