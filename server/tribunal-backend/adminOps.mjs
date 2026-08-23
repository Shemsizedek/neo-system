import {randomUUID} from 'node:crypto'
import {hashPassword,issueOpaqueToken,sha256,verifyPassword} from './security.mjs'

const now=()=>new Date().toISOString()
const futureMinutes=m=>new Date(Date.now()+m*60000).toISOString()
const row=(stmt,...args)=>stmt.get(...args)

export function changePassword(db,principal,{currentPassword,newPassword}){
  const user=row(db.prepare('SELECT * FROM users WHERE id=?'),principal.userId)
  if(!user||!verifyPassword(String(currentPassword||''),user.password_hash))throw new Error('Current password is invalid.')
  if(String(newPassword||'').length<10)throw new Error('New password must contain at least 10 characters.')
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hashPassword(newPassword),principal.userId)
  db.prepare('DELETE FROM sessions WHERE user_id=?').run(principal.userId)
  return {ok:true,changedAt:now(),sessionsRevoked:true}
}

export function issuePasswordReset(db,service,principal,workspaceId,{email,minutes=30}){
  service.authorize(principal,workspaceId,'GRAND_SHEIK')
  const user=row(db.prepare('SELECT u.id,u.email FROM users u JOIN memberships m ON m.user_id=u.id WHERE m.workspace_id=? AND lower(u.email)=lower(?)'),workspaceId,String(email||'').trim())
  if(!user)throw new Error('Workspace member not found.')
  const issued=issueOpaqueToken(),createdAt=now(),expiresAt=futureMinutes(Math.max(5,Math.min(Number(minutes)||30,120)))
  db.prepare('INSERT INTO password_resets(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)').run(issued.hash,user.id,expiresAt,createdAt)
  service.audit(principal,workspaceId,'PASSWORD_RESET_ISSUED',user.id,{expiresAt})
  return {token:issued.value,email:user.email,expiresAt}
}

export function consumePasswordReset(db,{token,newPassword}){
  if(String(newPassword||'').length<10)throw new Error('New password must contain at least 10 characters.')
  const tokenHash=sha256(String(token||'')),reset=row(db.prepare('SELECT * FROM password_resets WHERE token_hash=?'),tokenHash)
  if(!reset||reset.used_at||reset.expires_at<=now())throw new Error('Reset token is invalid or expired.')
  const usedAt=now();db.exec('BEGIN IMMEDIATE')
  try{db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hashPassword(newPassword),reset.user_id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(reset.user_id);db.prepare('UPDATE password_resets SET used_at=? WHERE token_hash=?').run(usedAt,tokenHash);db.exec('COMMIT')}catch(error){db.exec('ROLLBACK');throw error}
  return {ok:true,usedAt}
}

export function recordDelivery(db,service,principal,workspaceId,{noticeId,adapter='INTERNAL_RECORD',destination='',status='RECORDED',providerRef='',error=''}){
  service.authorize(principal,workspaceId,'CLERK')
  const allowed=['INTERNAL_RECORD','CERTIFIED_EMAIL_ADAPTER','WEBHOOK_ADAPTER'];if(!allowed.includes(adapter))throw new Error('Unsupported delivery adapter.')
  if(!noticeId||!destination)throw new Error('noticeId and destination are required.')
  const id=randomUUID(),createdAt=now();db.prepare('INSERT INTO delivery_attempts(id,workspace_id,notice_id,adapter,destination,status,provider_ref,error,created_at) VALUES(?,?,?,?,?,?,?,?,?)').run(id,workspaceId,noticeId,adapter,destination,status,providerRef||null,error||null,createdAt)
  service.audit(principal,workspaceId,'DELIVERY_RECORDED',noticeId,{id,adapter,destination,status})
  return {id,noticeId,adapter,destination,status,providerRef,error,createdAt}
}

export function listDeliveries(db,service,principal,workspaceId,noticeId=''){
  service.authorize(principal,workspaceId,'VIEWER')
  const rows=noticeId?db.prepare('SELECT * FROM delivery_attempts WHERE workspace_id=? AND notice_id=? ORDER BY created_at DESC').all(workspaceId,noticeId):db.prepare('SELECT * FROM delivery_attempts WHERE workspace_id=? ORDER BY created_at DESC LIMIT 100').all(workspaceId)
  return rows.map(r=>({id:r.id,noticeId:r.notice_id,adapter:r.adapter,destination:r.destination,status:r.status,providerRef:r.provider_ref,error:r.error,createdAt:r.created_at}))
}

export function operationalReport(db,service,principal,workspaceId){
  service.authorize(principal,workspaceId,'REVIEWER')
  const count=table=>db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE workspace_id=?`).get(workspaceId).n
  const sessions=db.prepare('SELECT COUNT(*) AS n FROM sessions s JOIN memberships m ON m.user_id=s.user_id WHERE m.workspace_id=? AND s.expires_at>?').get(workspaceId,now()).n
  return {workspaceId,generatedAt:now(),members:count('memberships'),cases:count('cases'),efiles:count('efiles'),notices:count('notices'),hearings:count('hearings'),deliveries:count('delivery_attempts'),auditEntries:count('audit_log'),activeSessions:sessions,audit:service.verifyAudit(workspaceId)}
}
