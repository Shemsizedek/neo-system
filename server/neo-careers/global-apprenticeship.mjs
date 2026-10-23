/** HR-038 global Temple apprenticeship intake policy.
 * Server-side preflight only: not employment authorization or jurisdictional legal advice.
 * No applicant PII should be persisted by this module.
 */
export const APPRENTICE_TRACKS=Object.freeze(['software','bitcoin-counterparty','research','education','media','operations','business-development'])
const countries=/^[A-Z]{2}$/
export function assessGlobalApprenticeIntake({age,country,track,engagement='training',mentorAssigned=false,programApproved=false,jurisdictionReviewed=false,payTermsApproved=false,workAuthorizationVerified=false}={}){
 const blockers=[]
 if(!Number.isInteger(age)||age<18)blockers.push('adult_only_pilot')
 if(typeof country!=='string'||!countries.test(country))blockers.push('country_required')
 if(!APPRENTICE_TRACKS.includes(track))blockers.push('unsupported_track')
 if(!['training','paid-project','employment'].includes(engagement))blockers.push('unsupported_engagement')
 if(mentorAssigned!==true)blockers.push('mentor_required')
 if(programApproved!==true)blockers.push('approved_program_required')
 if(jurisdictionReviewed!==true)blockers.push('local_law_review_required')
 if(engagement==='paid-project'||engagement==='employment'){
  if(payTermsApproved!==true)blockers.push('lawful_pay_terms_required')
  if(workAuthorizationVerified!==true)blockers.push('work_eligibility_required')
 }
 return Object.freeze({eligibleForHumanReview:blockers.length===0,blockers,acceptApplications:false,employmentAuthorized:false,paymentEnabled:false,equityPromised:false})
}
export function createApprenticeshipRole({track,mentorRole,outcomes=[],engagement='training'}={}){
 if(!APPRENTICE_TRACKS.includes(track))throw new TypeError('unsupported track')
 if(typeof mentorRole!=='string'||!mentorRole.trim())throw new TypeError('mentor required')
 if(!Array.isArray(outcomes)||outcomes.length<1||outcomes.some(x=>typeof x!=='string'||!x.trim()))throw new TypeError('learning outcomes required')
 if(!['training','paid-project','employment'].includes(engagement))throw new TypeError('unsupported engagement')
 return Object.freeze({track,mentorRole,outcomes:Object.freeze([...outcomes]),engagement,state:'draft',applicationsEnabled:false,offerEnabled:false,tokenAwardEnabled:false})
}
