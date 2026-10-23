import test from 'node:test'
import assert from 'node:assert/strict'
import {buildUnifiedLearnerView,evaluateMentorAccreditation} from './unified-giss-dashboard.mjs'
const claims={sub:'learner1',exp:Math.floor(Date.now()/1000)+3600,aud:'neo-careers-giss',roles:['student']}
const args={claims,trustedIdentity:true,studentRecord:{subject:'learner1',mentorSubject:'mentor1',modules:[{title:'GISS Foundations 101',state:'in-progress'}]},careerRecord:{subject:'learner1',track:'software',status:'training'},mentorRecord:{subject:'mentor1',displayName:'Mentor',accreditation:'verified'}}
test('untrusted identity cannot see records',()=>assert.equal(buildUnifiedLearnerView({...args,trustedIdentity:false}).ok,false))
test('student owns both school and career records',()=>assert.equal(buildUnifiedLearnerView({...args,careerRecord:{...args.careerRecord,subject:'other'}}).ok,false))
test('valid student sees sanitized course progress',()=>{const x=buildUnifiedLearnerView(args);assert.equal(x.ok,true);assert.equal(x.data.modules[0].state,'in-progress');assert.equal(x.data.canPay,false)})
test('unmatched mentor details excluded',()=>assert.equal(buildUnifiedLearnerView({...args,mentorRecord:{subject:'other',displayName:'private'}}).data.mentor,null))
test('expired identity rejected',()=>assert.equal(buildUnifiedLearnerView({...args,claims:{...claims,exp:1}}).ok,false))
test('mentor accreditation requires school review',()=>assert.equal(evaluateMentorAccreditation({mentorSubject:'mentor1',track:'software',identityVerified:true,qualificationsReviewed:true,safeguardingReviewed:true}).status,'pending'))
test('accreditation ready is not a recorded grant',()=>{const a=evaluateMentorAccreditation({mentorSubject:'mentor1',track:'software',identityVerified:true,qualificationsReviewed:true,safeguardingReviewed:true,schoolApproved:true});assert.equal(a.status,'ready-for-accreditation-record');assert.equal(a.authorizationGranted,false)})
