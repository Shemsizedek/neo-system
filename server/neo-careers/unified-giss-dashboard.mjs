import { APPRENTICE_TRACKS } from './global-apprenticeship.mjs'
/** HR041 presentation contract. Only caller-verified server identity + records. No database or LMS writes. */
export function buildUnifiedLearnerView({claims,trustedIdentity=false,studentRecord,careerRecord,mentorRecord}={}){
 if(trustedIdentity!==true||!claims||typeof claims.sub!=='string'||!claims.sub) return {ok:false,reason:'identity_not_verified',data:null}
 if(!Number.isSafeInteger(claims.exp)||claims.exp<=Math.floor(Date.now()/1000))return {ok:false,reason:'expired_session',data:null}
 if(claims.aud!=='neo-careers-giss')return {ok:false,reason:'audience_mismatch',data:null}
 if(!Array.isArray(claims.roles)||!claims.roles.includes('student'))return {ok:false,reason:'student_role_required',data:null}
 if(!studentRecord||studentRecord.subject!==claims.sub||careerRecord?.subject!==claims.sub)return {ok:false,reason:'record_ownership_failed',data:null}
 const track=APPRENTICE_TRACKS.includes(careerRecord.track)?careerRecord.track:null
 const modules=Array.isArray(studentRecord.modules)?studentRecord.modules.filter(x=>x&&typeof x.title==='string').slice(0,50).map(x=>({title:x.title,state:['not-started','in-progress','completed'].includes(x.state)?x.state:'not-started'})):[]
 return {ok:true,data:{school:'GISD',platform:'GISS',lms:'NEO Cipher',studentId:claims.sub,track,modules,mentor:mentorRecord?.subject===studentRecord.mentorSubject?{displayName:String(mentorRecord.displayName??'Assigned mentor'),accreditation:mentorRecord.accreditation==='verified'?'verified':'pending'}:null,careerStatus:String(careerRecord.status??'pending'),canEnroll:false,canIssueCertificate:false,canPay:false}}
}
export function evaluateMentorAccreditation({mentorSubject,track,identityVerified=false,qualificationsReviewed=false,safeguardingReviewed=false,schoolApproved=false}={}){
 const blockers=[]
 if(typeof mentorSubject!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(mentorSubject))blockers.push('invalid_subject')
 if(!APPRENTICE_TRACKS.includes(track))blockers.push('invalid_track')
 if(!identityVerified)blockers.push('identity_required')
 if(!qualificationsReviewed)blockers.push('qualification_review_required')
 if(!safeguardingReviewed)blockers.push('safeguarding_review_required')
 if(!schoolApproved)blockers.push('giss_approval_required')
 return {status:blockers.length?'pending':'ready-for-accreditation-record',blockers,recordWritten:false,authorizationGranted:false}
}
