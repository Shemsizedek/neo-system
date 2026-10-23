import test from 'node:test'
import assert from 'node:assert/strict'
import {assessGlobalApprenticeIntake,createApprenticeshipRole,APPRENTICE_TRACKS} from './global-apprenticeship.mjs'
const good={age:23,country:'NG',track:'software',engagement:'training',mentorAssigned:true,programApproved:true,jurisdictionReviewed:true}
test('default intake closed',()=>assert.equal(assessGlobalApprenticeIntake().eligibleForHumanReview,false))
test('adult supervised training can proceed to human review',()=>{const x=assessGlobalApprenticeIntake(good);assert.equal(x.eligibleForHumanReview,true);assert.equal(x.acceptApplications,false)})
test('underage excluded from initial pilot',()=>assert.ok(assessGlobalApprenticeIntake({...good,age:17}).blockers.includes('adult_only_pilot')))
test('paid international project needs work and pay approvals',()=>{const x=assessGlobalApprenticeIntake({...good,engagement:'paid-project'});assert.ok(x.blockers.includes('work_eligibility_required'));assert.ok(x.blockers.includes('lawful_pay_terms_required'))})
test('all relevant approvals never automatically enable payments',()=>{const x=assessGlobalApprenticeIntake({...good,engagement:'employment',payTermsApproved:true,workAuthorizationVerified:true});assert.equal(x.eligibleForHumanReview,true);assert.equal(x.paymentEnabled,false)})
test('a role always starts draft',()=>{const x=createApprenticeshipRole({track:APPRENTICE_TRACKS[0],mentorRole:'Senior Engineer',outcomes:['Deliver reviewed pull request']});assert.equal(x.state,'draft');assert.equal(x.applicationsEnabled,false)})
test('missing learning goals rejected',()=>assert.throws(()=>createApprenticeshipRole({track:'software',mentorRole:'Lead',outcomes:[]})))
