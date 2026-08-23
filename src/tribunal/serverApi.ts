import type {TribunalCase} from './tribunalEngine'
import type {TribunalRole} from './rbac'

export interface ServerSession {token:string;expiresAt:string;user:{id:string;email:string;displayName:string}}
export interface ServerWorkspace {id:string;name:string;role:TribunalRole;createdAt:string}
export interface CaseSyncResult {claimNo:string;revision:number;updatedAt:string}
export interface ServerHealth {ok:boolean;service:string;version:string;schema?:number;time?:string}
export interface ServerMember {userId:string;email:string;displayName:string;role:TribunalRole;createdAt:string}
export interface OpsReport {workspaceId:string;generatedAt:string;members:number;cases:number;efiles:number;notices:number;hearings:number;deliveries:number;auditEntries:number;activeSessions:number;audit:{valid:boolean;count:number;head:string|null}}
export interface CommTemplate {id:string;name:string;channel:string;subjectTemplate:string;bodyTemplate:string;createdAt:string}
export interface CommOutboxItem {id:string;noticeId?:string;channel:string;destination:string;subject:string;body:string;status:string;attemptCount:number;nextAttemptAt?:string|null;lastError?:string|null;providerRef?:string|null;receipt?:unknown;createdAt:string}
export interface CommReport {workspaceId:string;templates:number;providers:number;queued:number;delivered:number;deadLetters:number;calendarExports:number;generatedAt:string}

export class TribunalServerApi {
  constructor(public baseUrl='http://localhost:8787', public token=''){}
  private async request<T>(path:string,init:RequestInit={}):Promise<T>{const response=await fetch(`${this.baseUrl.replace(/\/$/,'')}${path}`,{...init,headers:{'content-type':'application/json',...(this.token?{authorization:`Bearer ${this.token}`}:{}) ,...(init.headers||{})}});const payload=await response.json().catch(()=>({error:`HTTP ${response.status}`}));if(!response.ok) throw new Error(payload.error||`HTTP ${response.status}`);return payload as T}
  health(){return this.request<ServerHealth>('/health')}
  register(input:{email:string;displayName:string;password:string}){return this.request('/v1/auth/register',{method:'POST',body:JSON.stringify(input)})}
  async login(input:{email:string;password:string}){const session=await this.request<ServerSession>('/v1/auth/login',{method:'POST',body:JSON.stringify(input)});this.token=session.token;return session}
  logout(){return this.request<{ok:boolean}>('/v1/auth/logout',{method:'POST'})}
  changePassword(input:{currentPassword:string;newPassword:string}){return this.request<{ok:boolean;changedAt:string;sessionsRevoked:boolean}>('/v1/auth/password',{method:'POST',body:JSON.stringify(input)})}
  consumePasswordReset(input:{token:string;newPassword:string}){return this.request<{ok:boolean;usedAt:string}>('/v1/auth/reset/consume',{method:'POST',body:JSON.stringify(input)})}
  listWorkspaces(){return this.request<{items:ServerWorkspace[]}>('/v1/workspaces')}
  createWorkspace(name:string){return this.request<ServerWorkspace>('/v1/workspaces',{method:'POST',body:JSON.stringify({name})})}
  invite(workspaceId:string,input:{email:string;role:TribunalRole;hours?:number}){return this.request<{token:string;email:string;role:TribunalRole;expiresAt:string}>(`/v1/workspaces/${encodeURIComponent(workspaceId)}/invitations`,{method:'POST',body:JSON.stringify(input)})}
  acceptInvite(token:string){return this.request<{workspaceId:string;role:TribunalRole;acceptedAt:string}>('/v1/invitations/accept',{method:'POST',body:JSON.stringify({token})})}
  listMembers(workspaceId:string){return this.request<{items:ServerMember[]}>(`/v1/workspaces/${encodeURIComponent(workspaceId)}/members`)}
  setMemberRole(workspaceId:string,userId:string,role:TribunalRole){return this.request(`/v1/workspaces/${encodeURIComponent(workspaceId)}/members/${encodeURIComponent(userId)}`,{method:'PATCH',body:JSON.stringify({role})})}
  issuePasswordReset(workspaceId:string,email:string){return this.request<{token:string;email:string;expiresAt:string}>(`/v1/workspaces/${encodeURIComponent(workspaceId)}/password-resets`,{method:'POST',body:JSON.stringify({email})})}
  listCases(workspaceId:string,q=''){return this.request<{items:Array<{claimNo:string;revision:number;updatedAt:string;createdAt:string}>}>(`/v1/workspaces/${encodeURIComponent(workspaceId)}/cases?q=${encodeURIComponent(q)}`)}
  getCase(workspaceId:string,claimNo:string){return this.request<{caseFile:TribunalCase;revision:number;updatedAt:string}>(`/v1/workspaces/${encodeURIComponent(workspaceId)}/cases/${encodeURIComponent(claimNo)}`)}
  saveCase(workspaceId:string,caseFile:TribunalCase,expectedRevision?:number){return this.request<CaseSyncResult>(`/v1/workspaces/${encodeURIComponent(workspaceId)}/cases/${encodeURIComponent(caseFile.claimNo)}`,{method:'PUT',body:JSON.stringify({caseFile,expectedRevision})})}
  fileEFile(workspaceId:string,efile:unknown){return this.request(`/v1/workspaces/${encodeURIComponent(workspaceId)}/efiles`,{method:'POST',body:JSON.stringify(efile)})}
  listEFiles(workspaceId:string,claimNo=''){return this.request<{items:unknown[]}>(`/v1/workspaces/${encodeURIComponent(workspaceId)}/efiles?claimNo=${encodeURIComponent(claimNo)}`)}
  saveNotice(workspaceId:string,notice:unknown){return this.request(`/v1/workspaces/${encodeURIComponent(workspaceId)}/notices`,{method:'POST',body:JSON.stringify(notice)})}
  listNotices(workspaceId:string,claimNo:string){return this.request<{items:unknown[]}>(`/v1/workspaces/${encodeURIComponent(workspaceId)}/notices?claimNo=${encodeURIComponent(claimNo)}`)}
  saveHearing(workspaceId:string,hearing:unknown){return this.request(`/v1/workspaces/${encodeURIComponent(workspaceId)}/hearings`,{method:'POST',body:JSON.stringify(hearing)})}
  listHearings(workspaceId:string,claimNo:string){return this.request<{items:unknown[]}>(`/v1/workspaces/${encodeURIComponent(workspaceId)}/hearings?claimNo=${encodeURIComponent(claimNo)}`)}
  recordDelivery(workspaceId:string,input:{noticeId:string;adapter:string;destination:string;status?:string;providerRef?:string;error?:string}){return this.request(`/v1/workspaces/${encodeURIComponent(workspaceId)}/deliveries`,{method:'POST',body:JSON.stringify(input)})}
  listDeliveries(workspaceId:string,noticeId=''){return this.request<{items:unknown[]}>(`/v1/workspaces/${encodeURIComponent(workspaceId)}/deliveries?noticeId=${encodeURIComponent(noticeId)}`)}
  operationsReport(workspaceId:string){return this.request<OpsReport>(`/v1/workspaces/${encodeURIComponent(workspaceId)}/reports/operations`)}
  createCommTemplate(workspaceId:string,input:{name:string;channel:string;subjectTemplate?:string;bodyTemplate:string}){return this.request<CommTemplate>(`/v1/workspaces/${encodeURIComponent(workspaceId)}/communications/templates`,{method:'POST',body:JSON.stringify(input)})}
  listCommTemplates(workspaceId:string){return this.request<{items:CommTemplate[]}>(`/v1/workspaces/${encodeURIComponent(workspaceId)}/communications/templates`)}
  saveProviderConfig(workspaceId:string,input:{id?:string;providerType:string;label:string;enabled?:boolean;secretConfig:Record<string,unknown>}){return this.request(`/v1/workspaces/${encodeURIComponent(workspaceId)}/communications/providers`,{method:'POST',body:JSON.stringify(input)})}
  listProviderConfigs(workspaceId:string){return this.request<{items:Array<{id:string;providerType:string;label:string;enabled:boolean;configFingerprint:string;updatedAt:string}>}>(`/v1/workspaces/${encodeURIComponent(workspaceId)}/communications/providers`)}
  queueCommunication(workspaceId:string,input:{noticeId?:string;channel:string;destination:string;subject?:string;body?:string;templateId?:string;templateData?:Record<string,unknown>}){return this.request<CommOutboxItem>(`/v1/workspaces/${encodeURIComponent(workspaceId)}/communications/outbox`,{method:'POST',body:JSON.stringify(input)})}
  listOutbox(workspaceId:string,status=''){return this.request<{items:CommOutboxItem[]}>(`/v1/workspaces/${encodeURIComponent(workspaceId)}/communications/outbox?status=${encodeURIComponent(status)}`)}
  processCommunication(workspaceId:string,id:string,input:{outcome?:'DELIVERED'|'FAILED';providerRef?:string;receipt?:unknown;error?:string;maxAttempts?:number}={}){return this.request<CommOutboxItem>(`/v1/workspaces/${encodeURIComponent(workspaceId)}/communications/outbox/${encodeURIComponent(id)}/process`,{method:'POST',body:JSON.stringify(input)})}
  retryCommunication(workspaceId:string,id:string){return this.request<CommOutboxItem>(`/v1/workspaces/${encodeURIComponent(workspaceId)}/communications/outbox/${encodeURIComponent(id)}/retry`,{method:'POST'})}
  communicationsReport(workspaceId:string){return this.request<CommReport>(`/v1/workspaces/${encodeURIComponent(workspaceId)}/communications/report`)}
  async hearingCalendarIcs(workspaceId:string,hearingId:string){const response=await fetch(`${this.baseUrl.replace(/\/$/,'')}/v1/workspaces/${encodeURIComponent(workspaceId)}/hearings/${encodeURIComponent(hearingId)}/calendar.ics`,{headers:{...(this.token?{authorization:`Bearer ${this.token}`}:{})}});if(!response.ok)throw new Error(`HTTP ${response.status}`);return {content:await response.text(),payloadHash:response.headers.get('x-neo-payload-sha256'),exportId:response.headers.get('x-neo-export-id')}}
  exportAudit(workspaceId:string,afterSeq=0){return this.request(`/v1/workspaces/${encodeURIComponent(workspaceId)}/audit/export?afterSeq=${afterSeq}`)}
  verifyAudit(workspaceId:string){return this.request<{valid:boolean;count:number;head:string|null}>(`/v1/workspaces/${encodeURIComponent(workspaceId)}/audit/verify`)}
}
