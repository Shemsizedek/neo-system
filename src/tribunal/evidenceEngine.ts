export type EvidenceKind = 'AFFIDAVIT' | 'DOCUMENT' | 'CORRESPONDENCE' | 'FINANCIAL_RECORD' | 'IMAGE' | 'AUDIO_VIDEO' | 'TESTIMONY' | 'OTHER'
export type EvidenceStatus = 'OFFERED' | 'ADMITTED' | 'EXCLUDED' | 'REVIEW_REQUIRED'
export type IntegrityState = 'UNHASHED' | 'HASHED' | 'VERIFIED'

export interface CustodyEvent {
  eventId: string
  at: string
  actor: string
  action: 'RECEIVED' | 'HASHED' | 'REVIEWED' | 'ADMITTED' | 'EXCLUDED' | 'TRANSFERRED' | 'NOTE'
  note?: string
}

export interface EvidenceItem {
  exhibitId: string
  title: string
  kind: EvidenceKind
  offeredBy: 'PETITIONER' | 'RESPONDENT' | 'TRIBUNAL'
  description: string
  sourceLocator?: string
  fileName?: string
  mediaType?: string
  sizeBytes?: number
  status: EvidenceStatus
  integrity: IntegrityState
  fingerprint?: string
  custody: CustodyEvent[]
  tags: string[]
}

const now = () => new Date().toISOString()

export function createEvidence(input: Omit<EvidenceItem,'exhibitId'|'status'|'integrity'|'custody'>, sequence: number): EvidenceItem {
  const exhibitId = `EX-${String(sequence).padStart(3,'0')}`
  return {
    ...input,
    exhibitId,
    status:'OFFERED',
    integrity:'UNHASHED',
    custody:[{eventId:`${exhibitId}-EV-001`,at:now(),actor:'E-File Intake',action:'RECEIVED',note:'Evidence entered into the internal Tribunal record.'}],
  }
}

export function recordCustody(item: EvidenceItem, actor: string, action: CustodyEvent['action'], note?: string): EvidenceItem {
  const eventId = `${item.exhibitId}-EV-${String(item.custody.length+1).padStart(3,'0')}`
  return {...item,custody:[...item.custody,{eventId,at:now(),actor,action,note}]}
}

export function setEvidenceStatus(item: EvidenceItem, status: EvidenceStatus, actor='Tribunal Clerk', note?: string): EvidenceItem {
  const action: CustodyEvent['action'] = status==='ADMITTED'?'ADMITTED':status==='EXCLUDED'?'EXCLUDED':'REVIEWED'
  return recordCustody({...item,status},actor,action,note)
}

export async function attachEvidenceFile(item: EvidenceItem, file: File, actor='E-File Intake'): Promise<EvidenceItem> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  const fingerprint = Array.from(new Uint8Array(digest)).map(byte=>byte.toString(16).padStart(2,'0')).join('')
  return recordCustody({...item,fileName:file.name,mediaType:file.type||'application/octet-stream',sizeBytes:file.size,fingerprint,integrity:'HASHED'},actor,'HASHED',`File ${file.name} hashed at intake. SHA-256 ${fingerprint}.`)
}

export function evidenceStats(items: EvidenceItem[]) {
  return {
    total:items.length,
    admitted:items.filter(item=>item.status==='ADMITTED').length,
    offered:items.filter(item=>item.status==='OFFERED').length,
    review:items.filter(item=>item.status==='REVIEW_REQUIRED').length,
    excluded:items.filter(item=>item.status==='EXCLUDED').length,
    hashed:items.filter(item=>item.integrity!=='UNHASHED').length,
  }
}

export function validateEvidenceRecord(item: EvidenceItem) {
  const problems:string[]=[]
  if(!item.title.trim()) problems.push('Missing exhibit title')
  if(!item.description.trim()) problems.push('Missing exhibit description')
  if(!item.custody.length) problems.push('Missing chain-of-custody event')
  if(item.fileName && !item.fingerprint) problems.push('Attached file is missing a cryptographic fingerprint')
  return {valid:problems.length===0,problems}
}
