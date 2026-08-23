export type ServiceMethod='EMAIL'|'CERTIFIED_EMAIL'|'PERSONAL'|'POSTAL'|'PUBLICATION'|'OTHER'
export type ServiceStatus='DRAFT'|'ISSUED'|'SENT'|'DELIVERED'|'FAILED'|'ACKNOWLEDGED'
export type HearingStatus='PROPOSED'|'SCHEDULED'|'HELD'|'CONTINUED'|'CANCELLED'

export interface ServiceNotice{
  noticeId:string
  claimNo:string
  recipient:string
  recipientEmail?:string
  method:ServiceMethod
  subject:string
  body:string
  status:ServiceStatus
  issuedAt?:string
  sentAt?:string
  deliveredAt?:string
  proofNote?:string
}

export interface Hearing{
  hearingId:string
  claimNo:string
  title:string
  startsAt:string
  durationMinutes:number
  location:string
  participants:string[]
  status:HearingStatus
  notes?:string
}

export function createNotice(claimNo:string,recipient:string,recipientEmail=''):ServiceNotice{
  return {noticeId:`NTC-${crypto.randomUUID().slice(0,8).toUpperCase()}`,claimNo,recipient,recipientEmail,method:'CERTIFIED_EMAIL',subject:`Notice — ${claimNo}`,body:'',status:'DRAFT'}
}

export function issueNotice(notice:ServiceNotice){
  if(!notice.recipient.trim()||!notice.subject.trim()||!notice.body.trim())throw new Error('Recipient, subject and notice body are required.')
  return {...notice,status:'ISSUED' as const,issuedAt:new Date().toISOString()}
}

export function markNotice(notice:ServiceNotice,status:ServiceStatus,proofNote?:string):ServiceNotice{
  const now=new Date().toISOString()
  return {...notice,status,proofNote:proofNote??notice.proofNote,sentAt:status==='SENT'?now:notice.sentAt,deliveredAt:(status==='DELIVERED'||status==='ACKNOWLEDGED')?now:notice.deliveredAt}
}

export function serviceComplete(notices:ServiceNotice[]){return notices.length>0&&notices.every(n=>n.status==='DELIVERED'||n.status==='ACKNOWLEDGED')}

export function createHearing(claimNo:string,startsAt:string,participants:string[]):Hearing{
  return {hearingId:`HRG-${crypto.randomUUID().slice(0,8).toUpperCase()}`,claimNo,title:`Tribunal Hearing — ${claimNo}`,startsAt,durationMinutes:60,location:'Virtual / Global District',participants,status:'PROPOSED'}
}

export function scheduleHearing(hearing:Hearing):Hearing{
  if(!hearing.startsAt||Number.isNaN(new Date(hearing.startsAt).getTime()))throw new Error('A valid hearing date and time is required.')
  if(hearing.participants.length<2)throw new Error('At least two participants are required.')
  return {...hearing,status:'SCHEDULED'}
}

export function hearingConflicts(candidate:Hearing,hearings:Hearing[]){
  const start=new Date(candidate.startsAt).getTime(),end=start+candidate.durationMinutes*60000
  return hearings.filter(h=>h.hearingId!==candidate.hearingId&&h.status==='SCHEDULED').filter(h=>{const hs=new Date(h.startsAt).getTime(),he=hs+h.durationMinutes*60000;return start<he&&end>hs})
}
