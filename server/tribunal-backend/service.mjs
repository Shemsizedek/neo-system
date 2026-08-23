import {randomUUID} from 'node:crypto'
import {decryptEnvelope,encryptEnvelope,hashPassword,issueOpaqueToken,sha256,verifyPassword} from './security.mjs'

const roles=['GRAND_SHEIK','JUDGE','CLERK','MARSHAL','REVIEWER','VIEWER']
const rank={VIEWER:0,REVIEWER:1,MARSHAL:1,CLERK:2,JUDGE:3,GRAND_SHEIK:4}
const now=()=>new Date().toISOString()
const futureHours=h=>new Date(Date.now()+h*3600000).toISOString()

function normalizeEmail(email){return String(email||'').trim().toLowerCase()}
function assertRole(role){if(!roles.includes(role))throw new Error('Invalid workspace role.')}
function row(stmt,...args){return stmt.get(...args)}

export class TribunalService{
  constructor(db){this.db=db}

  register({email,displayName,password}){
    email=normalizeEmail(email);if(!email||!displayName?.trim())throw new Error('Email and display name are required.')
    const id=randomUUID(),createdAt=now();this.db.prepare('INSERT INTO users(id,email,display_name,password_hash,created_at) VALUES(?,?,?,?,?)').run(id,email,displayName.trim(),hashPassword(password),createdAt)
    return {id,email,displayName:displayName.trim(),createdAt}
  }

  login({email,password}){
    const user=row(this.db.prepare('SELECT * FROM users WHERE email=?'),normalizeEmail(email));if(!user||!verifyPassword(password,user.password_hash))throw new Error('Invalid credentials.')
    const issued=issueOpaqueToken(),createdAt=now(),expiresAt=futureHours(12);this.db.prepare('INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)').run(issued.hash,user.id,expiresAt,createdAt)
    return {token:issued.value,expiresAt,user:{id:user.id,email:user.email,displayName:user.display_name}}
  }

  principal(token){
    const tokenHash=sha256(String(token||''));const session=row(this.db.prepare('SELECT s.*,u.email,u.display_name FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=?'),tokenHash)
    if(!session||session.expires_at<=now())throw new Error('Authentication required.')
    return {userId:session.user_id,email:session.email,displayName:session.display_name}
  }

  createWorkspace(principal,{name}){
    if(!name?.trim())throw new Error('Workspace name is required.')
    const id=randomUUID(),createdAt=now();const tx=this.db.transaction(()=>{this.db.prepare('INSERT INTO workspaces(id,name,created_by,created_at) VALUES(?,?,?,?)').run(id,name.trim(),principal.userId,createdAt);this.db.prepare('INSERT INTO memberships(workspace_id,user_id,role,created_at) VALUES(?,?,?,?)').run(id,principal.userId,'GRAND_SHEIK',createdAt)})
    tx();this.audit(principal,id,'WORKSPACE_CREATED',id,{name:name.trim()});return {id,name:name.trim(),role:'GRAND_SHEIK',createdAt}
  }

  membership(principal,workspaceId){const m=row(this.db.prepare('SELECT * FROM memberships WHERE workspace_id=? AND user_id=?'),workspaceId,principal.userId);if(!m)throw new Error('Workspace membership required.');return m}
  authorize(principal,workspaceId,minimum){const m=this.membership(principal,workspaceId);if((rank[m.role]??-1)<rank[minimum])throw new Error(`Role ${minimum} or higher required.`);return m}

  invite(principal,workspaceId,{email,role='VIEWER',hours=72}){
    this.authorize(principal,workspaceId,'CLERK');assertRole(role);email=normalizeEmail(email);if(!email)throw new Error('Invite email is required.')
    const issued=issueOpaqueToken(),createdAt=now(),expiresAt=futureHours(Math.max(1,Math.min(Number(hours)||72,168)));this.db.prepare('INSERT INTO invitations(token_hash,workspace_id,email,role,expires_at,invited_by,created_at) VALUES(?,?,?,?,?,?,?)').run(issued.hash,workspaceId,email,role,expiresAt,principal.userId,createdAt)
    this.audit(principal,workspaceId,'INVITATION_ISSUED',email,{role,expiresAt});return {token:issued.value,email,role,expiresAt}
  }

  acceptInvite(principal,token){
    const inv=row(this.db.prepare('SELECT * FROM invitations WHERE token_hash=?'),sha256(token));if(!inv||inv.accepted_at||inv.expires_at<=now())throw new Error('Invitation is invalid or expired.');if(normalizeEmail(principal.email)!==normalizeEmail(inv.email))throw new Error('Invitation email does not match authenticated user.')
    const acceptedAt=now();this.db.prepare('INSERT OR REPLACE INTO memberships(workspace_id,user_id,role,created_at) VALUES(?,?,?,?)').run(inv.workspace_id,principal.userId,inv.role,acceptedAt);this.db.prepare('UPDATE invitations SET accepted_at=? WHERE token_hash=?').run(acceptedAt,sha256(token));this.audit(principal,inv.workspace_id,'INVITATION_ACCEPTED',principal.userId,{role:inv.role});return {workspaceId:inv.workspace_id,role:inv.role,acceptedAt}
  }

  saveCase(principal,workspaceId,caseFile,expectedRevision){
    this.authorize(principal,workspaceId,'CLERK');if(!caseFile?.claimNo)throw new Error('claimNo is required.')
    const existing=row(this.db.prepare('SELECT * FROM cases WHERE claim_no=?'),caseFile.claimNo);if(existing&&existing.workspace_id!==workspaceId)throw new Error('Claim number belongs to another workspace.');if(existing&&expectedRevision!==undefined&&Number(expectedRevision)!==existing.revision)throw new Error(`Revision conflict: expected ${expectedRevision}, current ${existing.revision}.`)
    const revision=existing?existing.revision+1:1,stamp=now(),envelope=JSON.stringify(encryptEnvelope(caseFile));
    if(existing)this.db.prepare('UPDATE cases SET envelope_json=?,revision=?,updated_at=? WHERE claim_no=?').run(envelope,revision,stamp,caseFile.claimNo);else this.db.prepare('INSERT INTO cases(claim_no,workspace_id,envelope_json,revision,updated_at,created_at) VALUES(?,?,?,?,?,?)').run(caseFile.claimNo,workspaceId,envelope,revision,stamp,stamp)
    this.audit(principal,workspaceId,'CASE_SAVED',caseFile.claimNo,{revision,payloadHash:sha256(JSON.stringify(caseFile))});return {claimNo:caseFile.claimNo,revision,updatedAt:stamp}
  }

  getCase(principal,workspaceId,claimNo){this.authorize(principal,workspaceId,'VIEWER');const item=row(this.db.prepare('SELECT * FROM cases WHERE claim_no=? AND workspace_id=?'),claimNo,workspaceId);if(!item)throw new Error('Case not found.');return {caseFile:decryptEnvelope(JSON.parse(item.envelope_json)),revision:item.revision,updatedAt:item.updated_at}}

  listCases(principal,workspaceId){this.authorize(principal,workspaceId,'VIEWER');return this.db.prepare('SELECT claim_no,revision,updated_at,created_at FROM cases WHERE workspace_id=? ORDER BY updated_at DESC').all(workspaceId).map(r=>({claimNo:r.claim_no,revision:r.revision,updatedAt:r.updated_at,createdAt:r.created_at}))}

  audit(principal,workspaceId,action,subject,payload={}){
    const previous=row(this.db.prepare('SELECT entry_hash FROM audit_log WHERE workspace_id=? ORDER BY seq DESC LIMIT 1'),workspaceId)?.entry_hash||null,createdAt=now(),payloadHash=sha256(JSON.stringify(payload)),entryHash=sha256(JSON.stringify({workspaceId,actorUserId:principal.userId,action,subject,payloadHash,previousHash:previous,createdAt}));this.db.prepare('INSERT INTO audit_log(workspace_id,actor_user_id,action,subject,payload_hash,previous_hash,entry_hash,created_at) VALUES(?,?,?,?,?,?,?,?)').run(workspaceId,principal.userId,action,subject,payloadHash,previous,entryHash,createdAt);return entryHash
  }

  exportAudit(principal,workspaceId,afterSeq=0){this.authorize(principal,workspaceId,'REVIEWER');const entries=this.db.prepare('SELECT * FROM audit_log WHERE workspace_id=? AND seq>? ORDER BY seq').all(workspaceId,Number(afterSeq)||0);return {workspaceId,fromSeq:Number(afterSeq)||0,toSeq:entries.at(-1)?.seq||Number(afterSeq)||0,entries,replicaDigest:sha256(JSON.stringify(entries.map(e=>e.entry_hash)))}}

  verifyAudit(workspaceId){const entries=this.db.prepare('SELECT * FROM audit_log WHERE workspace_id=? ORDER BY seq').all(workspaceId);let previous=null;for(const entry of entries){const expected=sha256(JSON.stringify({workspaceId:entry.workspace_id,actorUserId:entry.actor_user_id,action:entry.action,subject:entry.subject,payloadHash:entry.payload_hash,previousHash:previous,createdAt:entry.created_at}));if(entry.previous_hash!==previous||entry.entry_hash!==expected)return {valid:false,seq:entry.seq};previous=entry.entry_hash}return {valid:true,count:entries.length,head:previous}}
}
