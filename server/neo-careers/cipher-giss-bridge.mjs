import { APPRENTICE_TRACKS } from './global-apprenticeship.mjs'
/** HR040: NEO Careers -> GISD/GISS -> NEO Cipher LMS. No live enrollment or PII. */
const PATHS=Object.freeze({
 software:['GISS Foundations 101','Arithmetic 101','Logic & Noology 101'],
 'bitcoin-counterparty':['GISS Foundations 101','Finance 101','Law 101'],
 research:['GISS Foundations 101','Logic & Noology 101','History & Ourstory 101'],
 education:['GISS Foundations 101','Grammar 101','Rhetoric & Dialectics 101'],
 media:['GISS Foundations 101','Harmonics & Music 101','Rhetoric & Dialectics 101'],
 operations:['GISS Foundations 101','Civics 101','Finance 101'],
 'business-development':['GISS Foundations 101','Rhetoric & Dialectics 101','Finance 101']
})
export function proposeCipherEnrollment({review,studentSubject,mentorSubject,identityVerified=false,schoolAuthorization=false,mentorAccredited=false,privacyReviewed=false}={}){
 const blockers=[]
 if(!review||review.status!=='ready-for-human-review')blockers.push('career_review_incomplete')
 if(!APPRENTICE_TRACKS.includes(review?.track))blockers.push('invalid_track')
 if(typeof studentSubject!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(studentSubject))blockers.push('invalid_student_subject')
 if(typeof mentorSubject!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(mentorSubject))blockers.push('invalid_mentor_subject')
 if(identityVerified!==true)blockers.push('neo_pass_verification_required')
 if(schoolAuthorization!==true)blockers.push('giss_authorization_required')
 if(mentorAccredited!==true)blockers.push('mentor_accreditation_required')
 if(privacyReviewed!==true)blockers.push('student_privacy_review_required')
 const approved=blockers.length===0
 return Object.freeze({status:approved?'ready-for-authorized-lms-write':'blocked',school:'GISD',platform:'GISS',learningSystem:'NEO Cipher',hall:'Nu University',track:review?.track??null,modules:PATHS[review?.track]??[],subject:approved?studentSubject:null,mentor:approved?mentorSubject:null,blockers,liveEnrollment:false,credentialIssued:false,paymentEnabled:false})
}
export function assessLearningMilestone({enrollment,unit,mentorAttested=false,assessmentPassed=false}={}){
 const allowed=enrollment?.status==='ready-for-authorized-lms-write'&&enrollment.modules.includes(unit)
 const blockers=[...(!allowed?['enrollment_or_module_not_authorized']:[]),...(!mentorAttested?['mentor_attestation_required']:[]),...(!assessmentPassed?['assessment_required']:[])]
 return Object.freeze({unit,status:blockers.length===0?'ready-for-lms-recording':'blocked',blockers,recordWritten:false,certificateIssued:false,employmentAuthorized:false})
}
export function cipherBridgeCapabilities(){return Object.freeze({candidateWrites:false,studentEnrollmentWrites:false,mentorRecordWrites:false,courseProgressWrites:false,liveLmsConnected:false})}
