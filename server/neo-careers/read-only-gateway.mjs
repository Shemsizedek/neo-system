import { assessCareersIntegration } from './integration-health.mjs'
import { createCareersRecordsReader } from './records-reader.mjs'
/** Server-only composition; caller must supply independently verified identity and an isolated DB driver. */
export function createCareersReadOnlyGateway({query,verifyIdentity,dependencyEvidence}={}){
 if(typeof query!=='function'||typeof verifyIdentity!=='function')throw new TypeError('trusted database and identity adapters required')
 const reader=createCareersRecordsReader({query})
 return Object.freeze({
  async records({credential,view}={}){
   const gate=assessCareersIntegration(dependencyEvidence)
   if(!gate.readyForAuthenticatedReadOnlyStaging)return {ok:false,reason:'dependencies_not_certified',records:[]}
   let claims
   try { claims=await verifyIdentity(credential) } catch { return {ok:false,reason:'identity_verification_failed',records:[]} }
   if(!claims||typeof claims!=='object')return {ok:false,reason:'identity_verification_failed',records:[]}
   if(view==='worker')return reader.workerRecords({claims,trustedVerification:true})
   if(view==='employer')return reader.employerRecords({claims,trustedVerification:true})
   return {ok:false,reason:'unsupported_view',records:[]}
  },
  status(){return {...assessCareersIntegration(dependencyEvidence),paymentEnabled:false,signingEnabled:false}}
 })
}
