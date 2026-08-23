import type {TribunalCase} from './tribunalEngine'
import type {TribunalRole} from './rbac'

export interface ServerSession {token:string;expiresAt:string;user:{id:string;email:string;displayName:string}}
export interface ServerWorkspace {id:string;name:string;role:TribunalRole;createdAt:string}
export interface CaseSyncResult {claimNo:string;revision:number;updatedAt:string}

export class TribunalServerApi {
  constructor(public baseUrl='http://localhost:8787', public token=''){}
  private async request<T>(path:string,init:RequestInit={}):Promise<T>{
    const response=await fetch(`${this.baseUrl}${path}`,{...init,headers:{'content-type':'application/json',...(this.token?{authorization:`Bearer ${this.token}`}:{}) ,...(init.headers||{})}})
    const payload=await response.json().catch(()=>({error:`HTTP ${response.status}`}))
    if(!response.ok) throw new Error(payload.error||`HTTP ${response.status}`)
    return payload as T
  }
  register(input:{email:string;displayName:string;password:string}){return this.request('/v1/auth/register',{method:'POST',body:JSON.stringify(input)})}
  async login(input:{email:string;password:string}){const session=await this.request<ServerSession>('/v1/auth/login',{method:'POST',body:JSON.stringify(input)});this.token=session.token;return session}
  createWorkspace(name:string){return this.request<ServerWorkspace>('/v1/workspaces',{method:'POST',body:JSON.stringify({name})})}
  invite(workspaceId:string,input:{email:string;role:TribunalRole;hours?:number}){return this.request<{token:string;email:string;role:TribunalRole;expiresAt:string}>(`/v1/workspaces/${encodeURIComponent(workspaceId)}/invitations`,{method:'POST',body:JSON.stringify(input)})}
  acceptInvite(token:string){return this.request<{workspaceId:string;role:TribunalRole;acceptedAt:string}>('/v1/invitations/accept',{method:'POST',body:JSON.stringify({token})})}
  listCases(workspaceId:string){return this.request<{items:Array<{claimNo:string;revision:number;updatedAt:string;createdAt:string}>}>(`/v1/workspaces/${encodeURIComponent(workspaceId)}/cases`)}
  getCase(workspaceId:string,claimNo:string){return this.request<{caseFile:TribunalCase;revision:number;updatedAt:string}>(`/v1/workspaces/${encodeURIComponent(workspaceId)}/cases/${encodeURIComponent(claimNo)}`)}
  saveCase(workspaceId:string,caseFile:TribunalCase,expectedRevision?:number){return this.request<CaseSyncResult>(`/v1/workspaces/${encodeURIComponent(workspaceId)}/cases/${encodeURIComponent(caseFile.claimNo)}`,{method:'PUT',body:JSON.stringify({caseFile,expectedRevision})})}
  exportAudit(workspaceId:string,afterSeq=0){return this.request(`/v1/workspaces/${encodeURIComponent(workspaceId)}/audit/export?afterSeq=${afterSeq}`)}
  verifyAudit(workspaceId:string){return this.request<{valid:boolean;count:number;head:string|null}>(`/v1/workspaces/${encodeURIComponent(workspaceId)}/audit/verify`)}
}
