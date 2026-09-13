import {randomUUID} from 'node:crypto'
import {decryptEnvelope,encryptEnvelope,sha256} from './security.mjs'

const now=()=>new Date().toISOString()
const text=(value,max=4000)=>String(value??'').trim().slice(0,max)
const email=value=>text(value,254).toLowerCase()
const validEmail=value=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

export function ensurePublicIntakeSchema(db){
  db.exec(`
    CREATE TABLE IF NOT EXISTS public_intakes(
      id TEXT PRIMARY KEY,
      receipt_code TEXT UNIQUE NOT NULL,
      payload_envelope TEXT NOT NULL,
      payload_hash TEXT NOT NULL,
      request_fingerprint TEXT NOT NULL,
      status TEXT NOT NULL,
      assigned_workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
      promoted_filing_id TEXT,
      reviewed_by TEXT,
      reviewed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_public_intakes_status ON public_intakes(status,created_at);
    CREATE INDEX IF NOT EXISTS idx_public_intakes_workspace ON public_intakes(assigned_workspace_id,status,created_at);
  `)
  const exists=db.prepare('SELECT 1 FROM schema_meta WHERE version=6 LIMIT 1').get()
  if(!exists)db.prepare('INSERT INTO schema_meta(version,applied_at) VALUES(?,?)').run(6,now())
}

function normalizeInput(input={}){
  const normalized={
    caseType:text(input.caseType||input.case_type,120),
    petitioner:text(input.petitioner,240),
    petitionerEmail:email(input.petitionerEmail||input.petitioner_email||input.email),
    petitionerLocation:text(input.petitionerLocation||input.petitioner_location,500),
    petitionerCouncil:text(input.petitionerCouncil||input.petitioner_council,240),
    respondent:text(input.respondent,240),
    respondentEmail:email(input.respondentEmail||input.respondent_email),
    respondentLocation:text(input.respondentLocation||input.respondent_location,500),
    respondentCouncil:text(input.respondentCouncil||input.respondent_council,240),
    referenceClaimNo:text(input.claimNo||input.claim_no,120),
    statement:text(input.statement,12000),
    consent:String(input.consent??'').toLowerCase()==='true'||String(input.consent??'')==='1'||String(input.consent??'').toLowerCase()==='on',
    website:text(input.website,200)
  }
  if(normalized.website)throw new Error('Submission rejected.')
  if(!normalized.caseType||!normalized.petitioner||!normalized.petitionerEmail||!normalized.respondent||!normalized.statement)throw new Error('Case type, petitioner, petitioner email, respondent, and statement are required.')
  if(!validEmail(normalized.petitionerEmail))throw new Error('A valid petitioner email is required.')
  if(!normalized.consent)throw new Error('Consent to submit this institutional court intake is required.')
  delete normalized.website
  return normalized
}

export function submitPublicIntake(db,input,request={}){
  ensurePublicIntakeSchema(db)
  const payload=normalizeInput(input)
  const id=randomUUID(),createdAt=now(),receiptCode=`WIC-${createdAt.slice(0,10).replaceAll('-','')}-${id.slice(0,8).toUpperCase()}`
  const payloadHash=sha256(JSON.stringify(payload))
  const requestFingerprint=sha256(JSON.stringify({ip:text(request.sourceIp,128),ua:text(request.userAgent,500),day:createdAt.slice(0,10)}))
  db.prepare(`INSERT INTO public_intakes(id,receipt_code,payload_envelope,payload_hash,request_fingerprint,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)`).run(id,receiptCode,JSON.stringify(encryptEnvelope(payload)),payloadHash,requestFingerprint,'PENDING_REVIEW',createdAt,createdAt)
  return {intakeId:id,receiptCode,status:'PENDING_REVIEW',payloadHash,receivedAt:createdAt,boundary:'Receipt confirms institutional intake only; it does not establish acceptance, jurisdiction, service, or external legal sufficiency.'}
}

const projectRow=row=>({
  intakeId:row.id,
  receiptCode:row.receipt_code,
  status:row.status,
  workspaceId:row.assigned_workspace_id,
  payloadHash:row.payload_hash,
  promotedFilingId:row.promoted_filing_id,
  reviewedBy:row.reviewed_by,
  reviewedAt:row.reviewed_at,
  createdAt:row.created_at,
  updatedAt:row.updated_at,
  payload:decryptEnvelope(JSON.parse(row.payload_envelope))
})

export function listPublicIntakes(db,service,principal,workspaceId,status=''){
  service.authorize(principal,workspaceId,'CLERK')
  ensurePublicIntakeSchema(db)
  const rows=status
    ? db.prepare(`SELECT * FROM public_intakes WHERE (assigned_workspace_id IS NULL OR assigned_workspace_id=?) AND status=? ORDER BY created_at DESC LIMIT 200`).all(workspaceId,status)
    : db.prepare(`SELECT * FROM public_intakes WHERE assigned_workspace_id IS NULL OR assigned_workspace_id=? ORDER BY created_at DESC LIMIT 200`).all(workspaceId)
  return rows.map(projectRow)
}

export function claimPublicIntake(db,service,principal,workspaceId,intakeId){
  service.authorize(principal,workspaceId,'JUDGE')
  ensurePublicIntakeSchema(db)
  const row=db.prepare('SELECT * FROM public_intakes WHERE id=?').get(intakeId)
  if(!row)throw new Error('Public intake not found.')
  if(row.assigned_workspace_id&&row.assigned_workspace_id!==workspaceId)throw new Error('Public intake is already assigned to another workspace.')
  if(row.status==='PROMOTED')throw new Error('Promoted intake cannot be reassigned.')
  const stamp=now()
  db.prepare(`UPDATE public_intakes SET assigned_workspace_id=?,status='UNDER_REVIEW',reviewed_by=?,reviewed_at=?,updated_at=? WHERE id=?`).run(workspaceId,principal.userId,stamp,stamp,intakeId)
  service.audit(principal,workspaceId,'PUBLIC_INTAKE_CLAIMED',intakeId,{receiptCode:row.receipt_code,payloadHash:row.payload_hash})
  return projectRow(db.prepare('SELECT * FROM public_intakes WHERE id=?').get(intakeId))
}

export function promotePublicIntake(db,service,principal,workspaceId,intakeId,{claimNo=''}={}){
  service.authorize(principal,workspaceId,'CLERK')
  ensurePublicIntakeSchema(db)
  const row=db.prepare('SELECT * FROM public_intakes WHERE id=? AND assigned_workspace_id=?').get(intakeId,workspaceId)
  if(!row)throw new Error('Assigned public intake not found.')
  if(row.status==='PROMOTED')return {intake:projectRow(row),filingId:row.promoted_filing_id,idempotent:true}
  if(row.status!=='UNDER_REVIEW')throw new Error('Intake must be claimed for review before promotion.')
  const payload=decryptEnvelope(JSON.parse(row.payload_envelope))
  const effectiveClaimNo=text(claimNo||payload.referenceClaimNo,120)||row.receipt_code
  const filing=service.fileEFile(principal,workspaceId,{
    claimNo:effectiveClaimNo,
    caseType:payload.caseType,
    statement:payload.statement,
    petitioner:payload.petitioner,
    petitionerEmail:payload.petitionerEmail,
    petitionerLocation:payload.petitionerLocation,
    petitionerCouncil:payload.petitionerCouncil,
    respondent:payload.respondent,
    respondentEmail:payload.respondentEmail,
    respondentLocation:payload.respondentLocation,
    respondentCouncil:payload.respondentCouncil,
    source:'WORLD_INTERFAITH_COURT_PUBLIC_INTAKE',
    intakeId,
    intakeReceiptCode:row.receipt_code,
    intakePayloadHash:row.payload_hash
  })
  const stamp=now()
  db.prepare(`UPDATE public_intakes SET status='PROMOTED',promoted_filing_id=?,reviewed_by=?,reviewed_at=?,updated_at=? WHERE id=?`).run(filing.filingId,principal.userId,stamp,stamp,intakeId)
  service.audit(principal,workspaceId,'PUBLIC_INTAKE_PROMOTED',intakeId,{filingId:filing.filingId,claimNo:effectiveClaimNo,payloadHash:row.payload_hash})
  return {intake:projectRow(db.prepare('SELECT * FROM public_intakes WHERE id=?').get(intakeId)),filing,idempotent:false}
}
