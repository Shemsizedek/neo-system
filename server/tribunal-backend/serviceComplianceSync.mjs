import {recordServiceAttempt,serviceCompliance} from './serviceLedger.mjs'
import {evaluateServiceEscalations} from './serviceCompliance.mjs'

const now=()=>new Date().toISOString()
const norm=v=>String(v??'').trim().toLowerCase()

export function syncCommunicationReceipts(db,service,principal,workspaceId,{claimNo=''}={}){
  service.authorize(principal,workspaceId,'CLERK')
  const recipients=claimNo?db.prepare('SELECT * FROM service_recipients WHERE workspace_id=? AND claim_no=? ORDER BY created_at').all(workspaceId,claimNo):db.prepare('SELECT * FROM service_recipients WHERE workspace_id=? ORDER BY created_at').all(workspaceId)
  const synced=[]
  for(const recipient of recipients){
    if(recipient.status==='SERVED')continue
    const communications=db.prepare("SELECT * FROM communication_outbox WHERE workspace_id=? AND notice_id=? AND status='DELIVERED' ORDER BY updated_at DESC").all(workspaceId,recipient.notice_id)
    const match=communications.find(item=>norm(item.destination)===norm(recipient.destination)&&norm(item.channel)===norm(recipient.channel))
    if(!match)continue
    const prior=db.prepare("SELECT entry_id FROM service_ledger WHERE workspace_id=? AND recipient_id=? AND communication_id=? AND action='SERVICE_ATTEMPT_RECORDED' LIMIT 1").get(workspaceId,recipient.id,match.id)
    if(prior)continue
    const result=recordServiceAttempt(db,service,principal,workspaceId,{recipientId:recipient.id,communicationId:match.id,status:'DELIVERED',providerRef:match.provider_ref||undefined,evidence:match.receipt_json?JSON.parse(match.receipt_json):{source:'communication_outbox',communicationId:match.id}})
    synced.push({recipientId:recipient.id,communicationId:match.id,entryId:result.entryId,status:result.status})
  }
  service.audit(principal,workspaceId,'SERVICE_RECEIPTS_SYNCHRONIZED',claimNo||workspaceId,{claimNo:claimNo||null,synced:synced.length})
  return{workspaceId,claimNo:claimNo||null,syncedCount:synced.length,items:synced,syncedAt:now()}
}

export function complianceRecommendations(db,service,principal,workspaceId,claimNo,options={}){
  service.authorize(principal,workspaceId,'REVIEWER')
  const compliance=serviceCompliance(db,service,principal,workspaceId,claimNo)
  const escalations=evaluateServiceEscalations(db,service,principal,workspaceId,claimNo,options)
  const recommendations=[]
  if(compliance.summary.overdue)recommendations.push({priority:'HIGH',action:'REVIEW_OVERDUE_SERVICE',reason:`${compliance.summary.overdue} recipient(s) are overdue.`})
  if(compliance.summary.failed)recommendations.push({priority:'HIGH',action:'REVIEW_FAILED_SERVICE',reason:`${compliance.summary.failed} recipient(s) have failed service records.`})
  if(compliance.summary.pending)recommendations.push({priority:'NORMAL',action:'CONTINUE_SERVICE_MONITORING',reason:`${compliance.summary.pending} recipient(s) remain pending.`})
  if(compliance.complete)recommendations.push({priority:'INFO',action:'REVIEW_PROOF_PACKET',reason:'All registered recipients are recorded as served; review the proof packet before internal closure.'})
  for(const alert of escalations.alerts){if(!recommendations.some(item=>item.action===alert.action))recommendations.push({priority:alert.level==='DUE_SOON'?'NORMAL':'HIGH',action:alert.action,reason:alert.reason,recipientId:alert.recipientId})}
  return{workspaceId,claimNo,compliance:compliance.summary,complete:compliance.complete,recommendations,generatedAt:now(),boundary:'NEOsync recommendations are decision support only. Authorized reviewers remain responsible for legal and procedural sufficiency.'}
}
