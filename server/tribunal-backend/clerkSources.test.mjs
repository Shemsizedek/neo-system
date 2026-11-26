import test from 'node:test'
import assert from 'node:assert/strict'
import {fromPublicIntakeReceipt,fromDesignatedCourtEmail,fromWordPressSubmission,triageClerkCandidates} from './clerkSources.mjs'

const at='2026-11-20T20:00:00Z'
test('existing public intake remains pending and preserves its receipt',()=>{
 const candidate=fromPublicIntakeReceipt({intakeId:'abc',receiptCode:'WIC-20261120-ABC',status:'PENDING_REVIEW',payloadHash:'a'.repeat(64),receivedAt:at})
 assert.equal(candidate.status,'PENDING_REVIEW')
 assert.equal(candidate.receiptCode,'WIC-20261120-ABC')
 assert.equal(candidate.authoritativeCase,false)
 assert.throws(()=>fromPublicIntakeReceipt({intakeId:'abc',receiptCode:'WIC-1',status:'PROMOTED',payloadHash:'a'.repeat(64),receivedAt:at}))
})
test('court email requires exact authorized mailbox and provider ID',()=>{
 assert.throws(()=>fromDesignatedCourtEmail({mailbox:'personal@example.test',providerMessageId:'x',receivedAt:at},{allowedMailbox:'court@example.test'}))
 const candidate=fromDesignatedCourtEmail({mailbox:'court@example.test',providerMessageId:'m1',receivedAt:at},{allowedMailbox:'court@example.test'})
 assert.equal(candidate.sourceChannel,'court_email')
})
test('WordPress submissions require allowlisted site and form',()=>{
 const submission={site:'holytemples.org',formId:85,submissionId:'101',receivedAt:at}
 assert.throws(()=>fromWordPressSubmission(submission,{allowedSite:'holytemples.org',allowedFormIds:[999]}))
 const candidate=fromWordPressSubmission(submission,{allowedSite:'holytemples.org',allowedFormIds:[85]})
 assert.equal(candidate.sourceChannel,'wordpress_form')
})
test('triage never duplicates identical immutable source identifiers',()=>{
 const a=fromDesignatedCourtEmail({mailbox:'court@example.test',providerMessageId:'m1',receivedAt:at},{allowedMailbox:'court@example.test'})
 const result=triageClerkCandidates([a,a])
 assert.equal(result.newCandidates.length,1)
 assert.equal(result.duplicates.length,1)
})
