/**
 * HR043: integration contract for the EXISTING Temple GISS API.
 * An authorization token scoped to gisd-office must not be reused by Careers.
 * Any cross-service grant requires explicit server authorization and member consent.
 */
export const EXISTING_GISS_ROUTES=Object.freeze({
  authorizationStatus:'/auth/giss/status',
  consentedAcademicRead:'/auth/giss/records',
  memberDashboard:'/api/v1/temple/giss/dashboard',
  enrollment:'/api/v1/temple/giss/enroll'
})
export function checkCareersGissAuthorization({tokenClaims,approvedClient,studentSubject,consentConfirmed=false}={}){
 const missing=[]
 if(approvedClient!=='neo-careers')missing.push('careers_client_registration_required')
 if(tokenClaims?.aud!=='neo-careers')missing.push('careers_specific_audience_required')
 if(tokenClaims?.scope!=='giss:read')missing.push('academic_read_scope_required')
 if(!studentSubject||tokenClaims?.sub!==studentSubject)missing.push('subject_binding_required')
 if(consentConfirmed!==true)missing.push('student_consent_required')
 if(!Number.isSafeInteger(tokenClaims?.exp)||tokenClaims.exp<=Math.floor(Date.now()/1000))missing.push('valid_expiration_required')
 return Object.freeze({authorized:missing.length===0,missing,canWrite:false,canEnroll:false,canIssueCertificate:false})
}
export function createExistingGissReadClient({getJson,baseUrl}={}){
 if(typeof getJson!=='function')throw new TypeError('trusted server fetch adapter required')
 if(typeof baseUrl!=='string'||!/^https:\/\/[^/?#]+$/.test(baseUrl))throw new TypeError('HTTPS service base URL required')
 return Object.freeze({
  async getConsentedRecords({authorization,studentSubject,tokenClaims,approvedClient,consentConfirmed}={}){
   const gate=checkCareersGissAuthorization({tokenClaims,approvedClient,studentSubject,consentConfirmed})
   if(!gate.authorized||typeof authorization!=='string'||!authorization.trim())return {ok:false,reason:'missing_service_authorization',data:null}
   const result=await getJson({url:baseUrl+EXISTING_GISS_ROUTES.consentedAcademicRead,authorization})
   if(!result||typeof result!=='object'||result.subject!==studentSubject)return {ok:false,reason:'upstream_subject_mismatch',data:null}
   return {ok:true,data:result,readOnly:true}
  },
  capabilities(){return {liveConnected:false,readOnly:true,serviceStatusVerified:false,careersGrantRegistered:false}}
 })
}
