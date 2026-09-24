import {randomUUID} from 'node:crypto'
import {sha256} from './security.mjs'

const now=()=>new Date().toISOString()
const text=(value,max=4000)=>String(value??'').trim().slice(0,max)
const allowedTypes=new Set(['CASE','ORDER','OPINION','NOTICE','HEARING','FILING','SERVICE_RECORD','OTHER'])

export function ensurePublicRecordsSchema(db){
  db.exec(`
    CREATE TABLE IF NOT EXISTS public_record_entries(
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      claim_no TEXT NOT NULL,
      record_type TEXT NOT NULL,
      source_id TEXT,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      public_payload_json TEXT NOT NULL,
      source_hash TEXT,
      publication_hash TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL,
      published_by TEXT NOT NULL,
      published_at TEXT NOT NULL,
      withdrawn_by TEXT,
      withdrawn_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_public_records_status ON public_record_entries(status,published_at);
    CREATE INDEX IF NOT EXISTS idx_public_records_claim ON public_record_entries(claim_no,status,published_at);
    CREATE INDEX IF NOT EXISTS idx_public_records_workspace ON public_record_entries(workspace_id,status,published_at);
  `)
  const exists=db.prepare('SELECT 1 FROM schema_meta WHERE version=7 LIMIT 1').get()
  if(!exists)db.prepare('INSERT INTO schema_meta(version,applied_at) VALUES(?,?)').run(7,now())
}

function normalizePayload(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return {}
  const out={}
  for(const [key,raw] of Object.entries(value)){
    const safeKey=text(key,80).replace(/[^a-zA-Z0-9_. -]/g,'')
    if(!safeKey)continue
    if(raw===null||typeof raw==='boolean'||typeof raw==='number')out[safeKey]=raw
    else if(typeof raw==='string')out[safeKey]=text(raw,4000)
    else if(Array.isArray(raw))out[safeKey]=raw.slice(0,100).map(item=>typeof item==='string'?text(item,1000):item===null||typeof item==='boolean'||typeof item==='number'?item:String(item).slice(0,1000))
  }
  return out
}

const publicProjection=row=>({
  recordId:row.id,
  claimNo:row.claim_no,
  recordType:row.record_type,
  sourceId:row.source_id,
  title:row.title,
  summary:row.summary,
  publicPayload:JSON.parse(row.public_payload_json),
  sourceHash:row.source_hash,
  publicationHash:row.publication_hash,
  publishedAt:row.published_at,
  boundary:'Published World Interfaith Court institutional record. Publication does not itself establish external governmental status, jurisdiction, or legal effect.'
})

export function publishPublicRecord(db,service,principal,workspaceId,input={}){
  service.authorize(principal,workspaceId,'JUDGE')
  ensurePublicRecordsSchema(db)
  const claimNo=text(input.claimNo||input.claim_no,120)
  const recordType=text(input.recordType||input.record_type,40).toUpperCase()
  const sourceId=text(input.sourceId||input.source_id,160)
  const title=text(input.title,300)
  const summary=text(input.summary,4000)
  const publicPayload=normalizePayload(input.publicPayload||input.public_payload||{})
  const sourceHash=text(input.sourceHash||input.source_hash,128)
  if(!claimNo||!title||!summary)throw new Error('Claim number, title, and summary are required.')
  if(!allowedTypes.has(recordType))throw new Error('Unsupported public record type.')
  const id=randomUUID(),stamp=now()
  const publicationHash=sha256(JSON.stringify({id,workspaceId,claimNo,recordType,sourceId,title,summary,publicPayload,sourceHash,publishedAt:stamp}))
  db.prepare(`INSERT INTO public_record_entries(id,workspace_id,claim_no,record_type,source_id,title,summary,public_payload_json,source_hash,publication_hash,status,published_by,published_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id,workspaceId,claimNo,recordType,sourceId||null,title,summary,JSON.stringify(publicPayload),sourceHash||null,publicationHash,'PUBLISHED',principal.userId,stamp,stamp,stamp)
  service.audit(principal,workspaceId,'PUBLIC_RECORD_PUBLISHED',id,{claimNo,recordType,sourceId,publicationHash})
  return publicProjection(db.prepare('SELECT * FROM public_record_entries WHERE id=?').get(id))
}

export function listPublishedRecords(db,{q='',claimNo='',recordType='',limit=100}={}){
  ensurePublicRecordsSchema(db)
  const safeLimit=Math.max(1,Math.min(200,Number(limit)||100))
  const query=text(q,300).toLowerCase(),claim=text(claimNo,120),type=text(recordType,40).toUpperCase()
  const rows=db.prepare(`SELECT * FROM public_record_entries WHERE status='PUBLISHED' ORDER BY published_at DESC LIMIT ?`).all(safeLimit*4)
  return rows.filter(row=>{
    if(claim&&row.claim_no!==claim)return false
    if(type&&row.record_type!==type)return false
    if(!query)return true
    const hay=`${row.claim_no} ${row.record_type} ${row.title} ${row.summary} ${row.public_payload_json}`.toLowerCase()
    return hay.includes(query)
  }).slice(0,safeLimit).map(publicProjection)
}

export function getPublishedRecord(db,recordId){
  ensurePublicRecordsSchema(db)
  const row=db.prepare(`SELECT * FROM public_record_entries WHERE id=? AND status='PUBLISHED'`).get(recordId)
  if(!row)throw new Error('Published record not found.')
  return publicProjection(row)
}

export function listWorkspacePublicRecords(db,service,principal,workspaceId,status=''){
  service.authorize(principal,workspaceId,'REVIEWER')
  ensurePublicRecordsSchema(db)
  const rows=status
    ? db.prepare('SELECT * FROM public_record_entries WHERE workspace_id=? AND status=? ORDER BY published_at DESC').all(workspaceId,text(status,40).toUpperCase())
    : db.prepare('SELECT * FROM public_record_entries WHERE workspace_id=? ORDER BY published_at DESC').all(workspaceId)
  return rows.map(row=>({...publicProjection(row),status:row.status,withdrawnAt:row.withdrawn_at}))
}

export function withdrawPublicRecord(db,service,principal,workspaceId,recordId){
  service.authorize(principal,workspaceId,'JUDGE')
  ensurePublicRecordsSchema(db)
  const row=db.prepare('SELECT * FROM public_record_entries WHERE id=? AND workspace_id=?').get(recordId,workspaceId)
  if(!row)throw new Error('Public record not found.')
  if(row.status==='WITHDRAWN')return {recordId,status:'WITHDRAWN',idempotent:true}
  const stamp=now()
  db.prepare(`UPDATE public_record_entries SET status='WITHDRAWN',withdrawn_by=?,withdrawn_at=?,updated_at=? WHERE id=?`).run(principal.userId,stamp,stamp,recordId)
  service.audit(principal,workspaceId,'PUBLIC_RECORD_WITHDRAWN',recordId,{claimNo:row.claim_no,publicationHash:row.publication_hash})
  return {recordId,status:'WITHDRAWN',withdrawnAt:stamp,idempotent:false}
}
