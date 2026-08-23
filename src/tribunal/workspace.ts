export type WorkspaceRole = 'GRAND_SHEIK' | 'JUDGE' | 'CLERK' | 'MARSHAL' | 'REVIEWER' | 'VIEWER'
export type MemberStatus = 'ACTIVE' | 'INVITED' | 'SUSPENDED'

export interface WorkspaceMember {
  memberId:string
  displayName:string
  email:string
  role:WorkspaceRole
  status:MemberStatus
  joinedAt?:string
}

export interface WorkspaceInvite {
  inviteId:string
  email:string
  role:WorkspaceRole
  issuedBy:string
  issuedAt:string
  expiresAt:string
  status:'PENDING'|'ACCEPTED'|'REVOKED'|'EXPIRED'
}

export interface AuditEntry {
  sequence:number
  at:string
  actor:string
  action:string
  subject:string
  detail?:string
  previousHash?:string
  hash:string
}

const workspaceKey='neo:tribunal:workspace:v1'
const auditKey='neo:tribunal:shared-audit:v1'
const encoder=new TextEncoder()

function readJson<T>(key:string,fallback:T):T{try{return JSON.parse(localStorage.getItem(key)||'') as T}catch{return fallback}}
function writeJson(key:string,value:unknown){localStorage.setItem(key,JSON.stringify(value))}
function hex(bytes:ArrayBuffer){return Array.from(new Uint8Array(bytes)).map(b=>b.toString(16).padStart(2,'0')).join('')}
async function sha256(value:string){return hex(await crypto.subtle.digest('SHA-256',encoder.encode(value)))}

export function readWorkspaceMembers():WorkspaceMember[]{
  const existing=readJson<WorkspaceMember[]>(workspaceKey,[])
  if(existing.length)return existing
  const seeded:WorkspaceMember[]=[{memberId:'MEM-001',displayName:'NEO Tribunal Administrator',email:'admin@internal.neo',role:'GRAND_SHEIK',status:'ACTIVE',joinedAt:new Date().toISOString()}]
  writeJson(workspaceKey,seeded);return seeded
}

export function saveWorkspaceMembers(members:WorkspaceMember[]){writeJson(workspaceKey,members)}

export function createInvite(email:string,role:WorkspaceRole,issuedBy:string,days=7):WorkspaceInvite{
  const issuedAt=new Date();const expiresAt=new Date(issuedAt.getTime()+days*86400000)
  return {inviteId:`INV-${crypto.randomUUID().slice(0,8).toUpperCase()}`,email:email.trim().toLowerCase(),role,issuedBy,issuedAt:issuedAt.toISOString(),expiresAt:expiresAt.toISOString(),status:'PENDING'}
}

export function readInvites():WorkspaceInvite[]{return readJson<WorkspaceInvite[]>('neo:tribunal:invites:v1',[])}
export function saveInvites(invites:WorkspaceInvite[]){writeJson('neo:tribunal:invites:v1',invites)}

export function readAuditLedger():AuditEntry[]{return readJson<AuditEntry[]>(auditKey,[])}

export async function appendAudit(actor:string,action:string,subject:string,detail?:string):Promise<AuditEntry>{
  const ledger=readAuditLedger();const previous=ledger.length?ledger[ledger.length-1]:undefined;const sequence=ledger.length+1;const at=new Date().toISOString()
  const canonical=JSON.stringify({sequence,at,actor,action,subject,detail,previousHash:previous?.hash})
  const entry:AuditEntry={sequence,at,actor,action,subject,detail,previousHash:previous?.hash,hash:await sha256(canonical)}
  writeJson(auditKey,[...ledger,entry]);return entry
}

export async function verifyAuditLedger(entries=readAuditLedger()){
  for(let i=0;i<entries.length;i++){
    const entry=entries[i];const previous=i?entries[i-1]:undefined
    if(entry.previousHash!==previous?.hash)return {valid:false,index:i,reason:'Previous hash mismatch'}
    const canonical=JSON.stringify({sequence:entry.sequence,at:entry.at,actor:entry.actor,action:entry.action,subject:entry.subject,detail:entry.detail,previousHash:entry.previousHash})
    if(await sha256(canonical)!==entry.hash)return {valid:false,index:i,reason:'Entry hash mismatch'}
  }
  return {valid:true,index:-1,reason:'Ledger chain verified'}
}
