import {randomUUID} from 'node:crypto'
import {sha256} from './security.mjs'

const now=()=>new Date().toISOString()
const text=(v,n=4000)=>String(v??'').trim().slice(0,n)
const kinds=new Set(['CASE_OPENED','FILING','NOTICE','HEARING','ORDER','OPINION','SERVICE','DISPOSITION','OTHER'])

export function ensurePublicDocketSchema(db){
  db.exec(`
    CREATE TABLE IF NOT EXISTS public_docket_events(
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      claim_no TEXT NOT NULL,
      event_kind TEXT NOT NULL,
      event_date TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      public_record_id TEXT,
      status TEXT NOT NULL,
      fingerprint TEXT NOT NULL UNIQUE,
      published_by TEXT NOT NULL,
      published_at TEXT NOT NULL,
      withdrawn_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_public_docket_claim ON public_docket_events(claim_no,status,event_date);
    CREATE INDEX IF NOT EXISTS idx_public_docket_calendar ON public_docket_events(event_kind,status,event_date);
  `)
  if(!db.prepare('SELECT 1 FROM schema_meta WHERE version=8 LIMIT 1').get())db.prepare('INSERT INTO schema_meta(version,applied_at) VALUES(?,?)').run(8,now())
}

const projection=r=>({eventId:r.id,claimNo:r.claim_no,eventKind:r.event_kind,eventDate:r.event_date,title:r.title,summary:r.summary,publicRecordId:r.public_record_id,fingerprint:r.fingerprint,publishedAt:r.published_at})

export function publishDocketEvent(db,service,principal,workspaceId,input={}){
  service.authorize(principal,workspaceId,'JUDGE');ensurePublicDocketSchema(db)
  const claimNo=text(input.claimNo,120),eventKind=text(input.eventKind,40).toUpperCase(),eventDate=text(input.eventDate,40),title=text(input.title,300),summary=text(input.summary,4000),publicRecordId=text(input.publicRecordId,160)
  if(!claimNo||!eventDate||!title||!summary)throw new Error('Claim number, event date, title, and summary are required.')
  if(!kinds.has(eventKind))throw new Error('Unsupported docket event kind.')
  if(publicRecordId){const record=db.prepare("SELECT * FROM public_record_entries WHERE id=? AND workspace_id=? AND status='PUBLISHED'").get(publicRecordId,workspaceId);if(!record)throw new Error('Linked public record must be published in this workspace.');if(record.claim_no!==claimNo)throw new Error('Linked public record claim number mismatch.')}
  const id=randomUUID(),stamp=now(),fingerprint=sha256(JSON.stringify({id,workspaceId,claimNo,eventKind,eventDate,title,summary,publicRecordId,publishedAt:stamp}))
  db.prepare(`INSERT INTO public_docket_events(id,workspace_id,claim_no,event_kind,event_date,title,summary,public_record_id,status,fingerprint,published_by,published_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id,workspaceId,claimNo,eventKind,eventDate,title,summary,publicRecordId||null,'PUBLISHED',fingerprint,principal.userId,stamp,stamp,stamp)
  service.audit(principal,workspaceId,'PUBLIC_DOCKET_EVENT_PUBLISHED',id,{claimNo,eventKind,fingerprint})
  return projection(db.prepare('SELECT * FROM public_docket_events WHERE id=?').get(id))
}

export function listPublicDocket(db,{claimNo='',kind='',from='',to='',limit=200}={}){
  ensurePublicDocketSchema(db);const cap=Math.max(1,Math.min(500,Number(limit)||200)),claim=text(claimNo,120),type=text(kind,40).toUpperCase()
  return db.prepare("SELECT * FROM public_docket_events WHERE status='PUBLISHED' ORDER BY event_date DESC,published_at DESC LIMIT ?").all(cap*3).filter(r=>(!claim||r.claim_no===claim)&&(!type||r.event_kind===type)&&(!from||r.event_date>=from)&&(!to||r.event_date<=to)).slice(0,cap).map(projection)
}

export function publicCaseDocket(db,claimNo){
  ensurePublicDocketSchema(db);const events=listPublicDocket(db,{claimNo,limit:500});if(!events.length)throw new Error('Public docket not found.')
  return {claimNo,events,hearingCalendar:events.filter(x=>x.eventKind==='HEARING'),orders:events.filter(x=>x.eventKind==='ORDER'),opinions:events.filter(x=>x.eventKind==='OPINION'),boundary:'Only affirmatively published World Interfaith Court docket material is shown.'}
}

export function listWorkspaceDocket(db,service,principal,workspaceId,status=''){
  service.authorize(principal,workspaceId,'REVIEWER');ensurePublicDocketSchema(db);const s=text(status,40).toUpperCase();const rows=s?db.prepare('SELECT * FROM public_docket_events WHERE workspace_id=? AND status=? ORDER BY event_date DESC').all(workspaceId,s):db.prepare('SELECT * FROM public_docket_events WHERE workspace_id=? ORDER BY event_date DESC').all(workspaceId);return rows.map(r=>({...projection(r),status:r.status,withdrawnAt:r.withdrawn_at}))
}

export function withdrawDocketEvent(db,service,principal,workspaceId,eventId){
  service.authorize(principal,workspaceId,'JUDGE');ensurePublicDocketSchema(db);const row=db.prepare('SELECT * FROM public_docket_events WHERE id=? AND workspace_id=?').get(eventId,workspaceId);if(!row)throw new Error('Docket event not found.');if(row.status==='WITHDRAWN')return {eventId,status:'WITHDRAWN',idempotent:true};const stamp=now();db.prepare("UPDATE public_docket_events SET status='WITHDRAWN',withdrawn_at=?,updated_at=? WHERE id=?").run(stamp,stamp,eventId);service.audit(principal,workspaceId,'PUBLIC_DOCKET_EVENT_WITHDRAWN',eventId,{claimNo:row.claim_no,fingerprint:row.fingerprint});return {eventId,status:'WITHDRAWN',withdrawnAt:stamp,idempotent:false}
}
