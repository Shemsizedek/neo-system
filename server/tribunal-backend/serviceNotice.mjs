import {createHmac,timingSafeEqual} from 'node:crypto'
import {decryptEnvelope,sha256} from './security.mjs'
import {hearingIcs,queueCommunication} from './communications.mjs'

const now=()=>new Date().toISOString()
const receiptKey=()=>process.env.NEO_TRIBUNAL_RECEIPT_KEY||process.env.NEO_TRIBUNAL_MASTER_KEY||'development-receipt-key'
const sign=value=>createHmac('sha256',receiptKey()).update(typeof value==='string'?value:JSON.stringify(value)).digest('hex')
const channelFor=type=>({SMTP:'EMAIL',CERTIFIED_EMAIL:'CERTIFIED_EMAIL',WEBHOOK:'WEBHOOK',RECORD:'RECORD'})[String(type||'').toUpperCase()]||String(type||'RECORD').toUpperCase()

export function buildServicePackage(db,service,principal,workspaceId,{noticeId,hearingId}={}){
  service.authorize(principal,workspaceId,'VIEWER')
  const noticeRow=db.prepare('SELECT envelope_json FROM notices WHERE notice_id=? AND workspace_id=?').get(noticeId,workspaceId)
  if(!noticeRow)throw new Error('Notice not found.')
  const notice=decryptEnvelope(JSON.parse(noticeRow.envelope_json))
  let hearing=null,calendar=null
  if(hearingId){
    const hearingRow=db.prepare('SELECT envelope_json FROM hearings WHERE hearing_id=? AND workspace_id=?').get(hearingId,workspaceId)
    if(!hearingRow)throw new Error('Hearing not found.')
    hearing=decryptEnvelope(JSON.parse(hearingRow.envelope_json))
    calendar=hearingIcs(db,service,principal,workspaceId,hearingId)
  }
  const packet={type:'NEO_TRIBUNAL_SERVICE_PACKAGE',version:'1.4',workspaceId,claimNo:notice.claimNo,noticeId,notice,hearing,calendar:calendar?{format:'ICS',payloadHash:calendar.payloadHash,content:calendar.content}:null,generatedAt:now()}
  const payloadHash=sha256(JSON.stringify(packet))
  service.audit(principal,workspaceId,'SERVICE_PACKAGE_GENERATED',noticeId,{hearingId:hearingId||null,payloadHash})
  return{...packet,payloadHash}
}

export function queueNoticeService(db,service,principal,workspaceId,input={}){
  service.authorize(principal,workspaceId,'CLERK')
  const packet=buildServicePackage(db,service,principal,workspaceId,{noticeId:input.noticeId,hearingId:input.hearingId})
  const deliveries=Array.isArray(input.destinations)?input.destinations:[]
  if(!deliveries.length)throw new Error('At least one service destination is required.')
  const queued=deliveries.map(item=>{
    const channel=channelFor(item.channel||item.providerType)
    const destination=String(item.destination||'').trim()
    if(!destination)throw new Error('Service destination is required.')
    const hearingText=packet.hearing?`\n\nHearing: ${packet.hearing.startsAt}${packet.hearing.location?` at ${packet.hearing.location}`:''}`:''
    return queueCommunication(db,service,principal,workspaceId,{noticeId:packet.noticeId,channel,destination,subject:item.subject||`Tribunal Notice — ${packet.claimNo}`,body:item.body||`${packet.notice.body||packet.notice.message||packet.notice.subject||'Tribunal notice'}${hearingText}\n\nService package SHA-256: ${packet.payloadHash}`})
  })
  service.audit(principal,workspaceId,'NOTICE_SERVICE_QUEUED',packet.noticeId,{count:queued.length,payloadHash:packet.payloadHash})
  return{noticeId:packet.noticeId,claimNo:packet.claimNo,payloadHash:packet.payloadHash,queued,generatedAt:now()}
}

export function verifyProviderCallback(payload,signature){
  const expected=sign(typeof payload==='string'?payload:JSON.stringify(payload)),given=String(signature||'').toLowerCase()
  if(!/^[a-f0-9]{64}$/.test(given))return false
  return timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(given,'hex'))
}

export function communicationsAuditBundle(db,service,principal,workspaceId,{noticeId=''}={}){
  service.authorize(principal,workspaceId,'REVIEWER')
  const rows=noticeId?db.prepare('SELECT * FROM communication_outbox WHERE workspace_id=? AND notice_id=? ORDER BY created_at').all(workspaceId,noticeId):db.prepare('SELECT * FROM communication_outbox WHERE workspace_id=? ORDER BY created_at').all(workspaceId)
  const entries=rows.map(r=>({id:r.id,noticeId:r.notice_id,channel:r.channel,destination:r.destination,status:r.status,attemptCount:r.attempt_count,providerRef:r.provider_ref,receipt:r.receipt_json?JSON.parse(r.receipt_json):null,createdAt:r.created_at,updatedAt:r.updated_at}))
  const audit=service.verifyAudit(workspaceId)
  const bundle={type:'NEO_COMMUNICATIONS_AUDIT_BUNDLE',version:'1.4',workspaceId,noticeId:noticeId||null,entries,auditHead:audit.head||null,generatedAt:now()}
  return{...bundle,payloadHash:sha256(JSON.stringify(bundle))}
}

export function providerHealth(db,service,principal,workspaceId){
  service.authorize(principal,workspaceId,'REVIEWER')
  const configs=db.prepare('SELECT id,provider_type,label,enabled,updated_at FROM provider_configs WHERE workspace_id=? ORDER BY provider_type,label').all(workspaceId)
  const pending=db.prepare("SELECT channel,COUNT(*) n,MIN(created_at) oldest FROM communication_outbox WHERE workspace_id=? AND status IN ('QUEUED','RETRY','AWAITING_PROVIDER') GROUP BY channel").all(workspaceId)
  const dead=db.prepare("SELECT channel,COUNT(*) n FROM communication_outbox WHERE workspace_id=? AND status='DEAD_LETTER' GROUP BY channel").all(workspaceId)
  return{workspaceId,generatedAt:now(),providers:configs.map(c=>({id:c.id,type:c.provider_type,label:c.label,enabled:Boolean(c.enabled),updatedAt:c.updated_at,pending:Number(pending.find(p=>channelFor(c.provider_type)===p.channel)?.n||0),deadLetters:Number(dead.find(p=>channelFor(c.provider_type)===p.channel)?.n||0)})),queue:{pending:pending.reduce((n,r)=>n+Number(r.n),0),deadLetters:dead.reduce((n,r)=>n+Number(r.n),0),oldestPending:pending.map(r=>r.oldest).filter(Boolean).sort()[0]||null}}
}
