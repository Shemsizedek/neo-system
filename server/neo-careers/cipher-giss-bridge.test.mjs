import test from 'node:test'
import assert from 'node:assert/strict'
import {proposeCipherEnrollment,assessLearningMilestone,cipherBridgeCapabilities} from './cipher-giss-bridge.mjs'
const review={status:'ready-for-human-review',track:'software'}
const valid={review,studentSubject:'student1',mentorSubject:'mentor1',identityVerified:true,schoolAuthorization:true,mentorAccredited:true,privacyReviewed:true}
test('unverified applicant cannot join GISS',()=>assert.equal(proposeCipherEnrollment({review}).status,'blocked'))
test('approved records remain proposed, not actually enrolled',()=>{const x=proposeCipherEnrollment(valid);assert.equal(x.status,'ready-for-authorized-lms-write');assert.equal(x.liveEnrollment,false);assert.equal(x.platform,'GISS');assert.equal(x.learningSystem,'NEO Cipher')})
test('unapproved applicant review is blocked',()=>assert.ok(proposeCipherEnrollment({...valid,review:{...review,status:'blocked'}}).blockers.includes('career_review_incomplete')))
test('tracks map to official GISS course spine',()=>assert.ok(proposeCipherEnrollment(valid).modules.includes('GISS Foundations 101')))
test('mentor attestation and assessment required',()=>{const x=assessLearningMilestone({enrollment:proposeCipherEnrollment(valid),unit:'GISS Foundations 101'});assert.equal(x.status,'blocked')})
test('course milestone cannot issue credentials automatically',()=>{const x=assessLearningMilestone({enrollment:proposeCipherEnrollment(valid),unit:'GISS Foundations 101',mentorAttested:true,assessmentPassed:true});assert.equal(x.status,'ready-for-lms-recording');assert.equal(x.recordWritten,false);assert.equal(x.certificateIssued,false)})
test('bridge does not claim live NEO Cipher connection',()=>assert.equal(cipherBridgeCapabilities().liveLmsConnected,false))
