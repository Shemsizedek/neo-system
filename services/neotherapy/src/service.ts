import type {NeotherapyStore} from './store'
import type {SessionRecord} from './domain'
export class NeotherapyService{
 constructor(private store:NeotherapyStore){}
 async authorizeModality(participantId:string,practitionerId:string,modalityId:string,safetyScreenComplete:boolean){
  const consent=await this.store.getConsent(participantId,modalityId)
  if(!consent||consent.status!=='ACTIVE') throw new Error('ACTIVE_CONSENT_REQUIRED')
  const credential=await this.store.getCredential(practitionerId)
  if(!credential||credential.status!=='ACTIVE') throw new Error('ACTIVE_CREDENTIAL_REQUIRED')
  if(!credential.modalities.includes(modalityId)) throw new Error('MODALITY_AUTHORIZATION_REQUIRED')
  if(!safetyScreenComplete) throw new Error('SAFETY_SCREEN_REQUIRED')
  return true
 }
 async saveSession(record:SessionRecord,actorId:string){
  await this.store.saveSession(record)
  await this.store.appendAudit({id:'audit-'+record.id+'-'+Date.now(),actorId,action:'SESSION_SAVED',resourceType:'SESSION',resourceId:record.id,timestamp:new Date().toISOString()})
  return record
 }
}
