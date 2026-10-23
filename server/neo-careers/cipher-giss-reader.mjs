import { buildUnifiedLearnerView } from './unified-giss-dashboard.mjs'
/** HR042: read-only server-side GISS and Careers composition; adapters injected by trusted backend. */
export function createCipherGissReader({verifySession,readStudent,readCareer,readMentor}={}){
 if([verifySession,readStudent,readCareer,readMentor].some(f=>typeof f!=='function'))throw new TypeError('trusted adapters required')
 return Object.freeze({
  async learner({credential}={}){
   let claims
   try{claims=await verifySession(credential)}catch{return {ok:false,reason:'identity_verification_failed',data:null}}
   if(!claims||typeof claims.sub!=='string')return {ok:false,reason:'identity_verification_failed',data:null}
   try{
    const [studentRecord,careerRecord]=await Promise.all([readStudent(claims.sub),readCareer(claims.sub)])
    if(!studentRecord||!careerRecord||studentRecord.subject!==claims.sub||careerRecord.subject!==claims.sub)return {ok:false,reason:'record_ownership_failed',data:null}
    const mentorRecord=studentRecord.mentorSubject?await readMentor(studentRecord.mentorSubject):null
    return buildUnifiedLearnerView({claims,trustedIdentity:true,studentRecord,careerRecord,mentorRecord})
   }catch{return {ok:false,reason:'upstream_unavailable',data:null}}
  },
  capabilities(){return {readOnly:true,liveGissConnected:false,enrollmentWrites:false,certificateWrites:false,mentorWrites:false}}
 })
}
