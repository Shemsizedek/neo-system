import type {AuditEvent,ConsentRecord,CredentialRecord,SessionRecord} from './domain'
export interface NeotherapyStore{
 getConsent(participantId:string,modalityId:string):Promise<ConsentRecord|undefined>
 saveConsent(record:ConsentRecord):Promise<void>
 getCredential(practitionerId:string):Promise<CredentialRecord|undefined>
 saveCredential(record:CredentialRecord):Promise<void>
 getSession(id:string):Promise<SessionRecord|undefined>
 saveSession(record:SessionRecord):Promise<void>
 appendAudit(event:AuditEvent):Promise<void>
}
export class MemoryNeotherapyStore implements NeotherapyStore{
 private consents=new Map<string,ConsentRecord>();private credentials=new Map<string,CredentialRecord>();private sessions=new Map<string,SessionRecord>();readonly audit:AuditEvent[]=[]
 async getConsent(p:string,m:string){return this.consents.get(p+':'+m)}
 async saveConsent(r:ConsentRecord){this.consents.set(r.participantId+':'+r.modalityId,r)}
 async getCredential(p:string){return this.credentials.get(p)}
 async saveCredential(r:CredentialRecord){this.credentials.set(r.practitionerId,r)}
 async getSession(id:string){return this.sessions.get(id)}
 async saveSession(r:SessionRecord){this.sessions.set(r.id,r)}
 async appendAudit(e:AuditEvent){this.audit.push(e)}
}
