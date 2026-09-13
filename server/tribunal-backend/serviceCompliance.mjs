import {randomUUID,createHash} from 'node:crypto'
const now=()=>new Date().toISOString()
const clean=v=>String(v??'').trim()
const sha=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex')

export function serviceTimeline(db,service,principal,workspaceId,claimNo){
  service.authorize(principal,workspaceId,'VIEWER')
  const recipients=db.prepare('SELECT * FROM service_recipients WHERE workspace_id=? AND claim_no=? ORDER BY created_at').all(workspaceId,claimNo)
  const events=[]
  for(const r of recipients){
    events.push({at:r.created_at,type:'RECIPIENT_REGISTERED',recipientId:r.id,status:r.status,detail:r.destination})
    const attempts=db.prepare("SELECT * FROM service_ledger WHERE workspace_id=? AND recipient_id=? AND action='SERVICE_ATTEMPT_RECORDED' ORDER BY seq").all(workspaceId,r.id)
    for(const a of attempts){const details=JSON.parse(a.details_json||'{}');events.push({at:a.created_at,type:'SERVICE_ATTEMPT',recipientId:r.id,status:a.status,detail:details.error||details.providerRef||'',evidenceHash:a.evidence_hash||null,entryHash:a.entry_hash})}
    const proofs=db.prepare('SELECT * FROM service_proofs WHERE workspace_id=? AND recipient_id=? ORDER BY created_at').all(workspaceId,r.id)
    for(const p of proofs)events.push({at:p.created_at,type:'PROOF_ISSUED',recipientId:r.id,status:'PROOF',detail:p.proof_type,payloadHash:p.payload_hash})
  }
  return events.sort((a,b)=>String(a.at).localeCompare(String(b.at)))
}

export function evaluateServiceEscalations(db,service,principal,workspaceId,claimNo,{graceHours=24,maxAttempts=3}={}){
  service.authorize(principal,workspaceId,'REVIEWER')
  const rows=db.prepare('SELECT * FROM service_recipients WHERE workspace_id=? AND claim_no=? ORDER BY created_at').all(workspaceId,claimNo)
  const current=Date.now(),alerts=[]
  for(const r of rows){
    const attempts=db.prepare("SELECT COUNT(*) AS n FROM service_ledger WHERE workspace_id=? AND recipient_id=? AND action='SERVICE_ATTEMPT_RECORDED'").get(workspaceId,r.id).n
    const deadline=r.deadline_at?new Date(r.deadline_at).getTime():null
    if(r.status==='SERVED')continue
    if(deadline&&current>deadline)alerts.push({recipientId:r.id,level:'OVERDUE',action:'REVIEW_ALTERNATE_SERVICE',reason:'Service deadline has passed.'})
    else if(deadline&&deadline-current<=Number(graceHours)*3600000)alerts.push({recipientId:r.id,level:'DUE_SOON',action:'EXPEDITE_SERVICE',reason:'Service deadline is approaching.'})
    if(attempts>=Number(maxAttempts))alerts.push({recipientId:r.id,level:'ATTEMPT_LIMIT',action:'REVIEW_ALTERNATE_SERVICE',reason:`${attempts} recorded attempts.`})
  }
  return{workspaceId,claimNo,alerts,generatedAt:now(),boundary:'Escalations are workflow recommendations. Alternate service must be reviewed under applicable Tribunal rules and any governing external law.'}
}

export function buildProofPacket(db,service,principal,workspaceId,claimNo){
  service.authorize(principal,workspaceId,'REVIEWER')
  const recipients=db.prepare('SELECT * FROM service_recipients WHERE workspace_id=? AND claim_no=? ORDER BY created_at').all(workspaceId,claimNo)
  const proofs=db.prepare('SELECT * FROM service_proofs WHERE workspace_id=? AND claim_no=? ORDER BY created_at').all(workspaceId,claimNo)
  const timeline=serviceTimeline(db,service,principal,workspaceId,claimNo)
  const packet={packetId:randomUUID(),workspaceId,claimNo,generatedAt:now(),recipients,proofs,timeline,boundary:'Internal Tribunal proof packet. External legal effect depends on applicable law and recognized service rules.'}
  return{...packet,payloadHash:sha(packet)}
}

export function alternateServicePlan(db,service,principal,workspaceId,input){
  service.authorize(principal,workspaceId,'CLERK')
  const recipient=db.prepare('SELECT * FROM service_recipients WHERE id=? AND workspace_id=?').get(input.recipientId,workspaceId)
  if(!recipient)throw new Error('Service recipient not found.')
  const channels=Array.isArray(input.channels)?input.channels.map(v=>clean(v).toUpperCase()).filter(Boolean):[]
  if(!channels.length)throw new Error('Alternate service plan requires at least one channel.')
  const plan={planId:randomUUID(),recipientId:recipient.id,claimNo:recipient.claim_no,channels,reason:clean(input.reason),createdAt:now(),status:'PROPOSED',boundary:'Plan requires authorized review before use; it does not itself establish legally sufficient service.'}
  service.audit(principal,workspaceId,'ALTERNATE_SERVICE_PLAN_CREATED',plan.planId,plan)
  return plan
}
