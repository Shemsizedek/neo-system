import {sha256Fingerprint} from '../corpus/corpusEngine'
import type {CorpusCitation} from '../corpus/sourceStore'
import type {EvidenceItem} from './evidenceEngine'
import type {TribunalOpinion} from './opinionBuilder'

export type BurdenStandard = 'PREPONDERANCE' | 'CLEAR_AND_CONVINCING' | 'BEYOND_REASONABLE_DOUBT' | 'INTERNAL_EQUITY_REVIEW'
export type FindingStatus = 'PROPOSED' | 'SUSTAINED' | 'NOT_SUSTAINED' | 'INSUFFICIENT_RECORD'

export interface FindingOfFact {
  findingId: string
  proposition: string
  status: FindingStatus
  burden: BurdenStandard
  exhibitIds: string[]
  citationIds: string[]
  rationale: string
}

export interface CustodyReceipt {
  receiptId: string
  exhibitId: string
  actor: string
  issuedAt: string
  evidenceFingerprint?: string
  receiptFingerprint: string
  statement: string
}

export interface OpinionPacket {
  packetId: string
  claimNo: string
  generatedAt: string
  opinion: TribunalOpinion
  findings: FindingOfFact[]
  citations: CorpusCitation[]
  exhibits: EvidenceItem[]
  manifestFingerprint: string
  notice: string
}

export async function hashEvidenceContent(item: EvidenceItem, payload: string): Promise<EvidenceItem> {
  const fingerprint = await sha256Fingerprint(payload)
  return {...item,fingerprint,integrity:'HASHED'}
}

export async function issueCustodyReceipt(item: EvidenceItem, actor='Tribunal Clerk'): Promise<CustodyReceipt> {
  const issuedAt = new Date().toISOString()
  const statement = `${actor} acknowledges custody record for ${item.exhibitId} (${item.title}) at ${issuedAt}.`
  const receiptFingerprint = await sha256Fingerprint([item.exhibitId,item.fingerprint??'UNHASHED',actor,issuedAt,statement].join('|'))
  return {receiptId:`RCP-${item.exhibitId}-${issuedAt.replaceAll(/[^0-9]/g,'').slice(0,14)}`,exhibitId:item.exhibitId,actor,issuedAt,evidenceFingerprint:item.fingerprint,receiptFingerprint,statement}
}

export function createFinding(input: Omit<FindingOfFact,'findingId'>, sequence: number): FindingOfFact {
  return {...input,findingId:`FOF-${String(sequence).padStart(3,'0')}`}
}

export function validateFinding(finding: FindingOfFact, citations: CorpusCitation[], evidence: EvidenceItem[]) {
  const citationIds = new Set(citations.map(item=>item.citationId))
  const exhibitIds = new Set(evidence.filter(item=>item.status==='ADMITTED').map(item=>item.exhibitId))
  const problems:string[]=[]
  if(!finding.proposition.trim()) problems.push('Finding proposition is empty')
  if(!finding.rationale.trim()) problems.push('Finding rationale is empty')
  for(const id of finding.citationIds) if(!citationIds.has(id)) problems.push(`Citation ${id} is not attached to the case`)
  for(const id of finding.exhibitIds) if(!exhibitIds.has(id)) problems.push(`Exhibit ${id} is not admitted`)
  return {valid:problems.length===0,problems}
}

export async function buildOpinionPacket(input:{claimNo:string;opinion:TribunalOpinion;findings:FindingOfFact[];citations:CorpusCitation[];exhibits:EvidenceItem[]}):Promise<OpinionPacket>{
  const generatedAt=new Date().toISOString()
  const manifest={claimNo:input.claimNo,opinionId:input.opinion.opinionId,findings:input.findings.map(f=>f.findingId),citations:input.citations.map(c=>c.citationId),exhibits:input.exhibits.map(e=>({id:e.exhibitId,fingerprint:e.fingerprint??null,status:e.status}))}
  const manifestFingerprint=await sha256Fingerprint(JSON.stringify(manifest))
  return {...input,packetId:`PKT-${input.claimNo}`,generatedAt,manifestFingerprint,notice:'Internal Tribunal record packet. The packet preserves provenance and analytical links; it does not by itself create external legal effect.'}
}

export function renderPacket(packet: OpinionPacket, receipts: CustodyReceipt[]) {
  const lines=[`TRIBUNAL OPINION PACKET — ${packet.claimNo}`,`Packet: ${packet.packetId}`,`Generated: ${packet.generatedAt}`,`Manifest SHA-256: ${packet.manifestFingerprint}`,'',packet.notice,'','FINDINGS OF FACT']
  for(const f of packet.findings) lines.push(`${f.findingId} [${f.status}] [${f.burden}] ${f.proposition}\nRationale: ${f.rationale}\nExhibits: ${f.exhibitIds.join(', ')||'—'}\nAuthorities: ${f.citationIds.join(', ')||'—'}`)
  lines.push('','EVIDENCE MANIFEST')
  for(const e of packet.exhibits) lines.push(`${e.exhibitId} — ${e.title} — ${e.status} — SHA-256 ${e.fingerprint??'UNHASHED'}`)
  lines.push('','CUSTODY RECEIPTS')
  for(const r of receipts) lines.push(`${r.receiptId} — ${r.exhibitId} — ${r.actor} — ${r.receiptFingerprint}`)
  lines.push('','OPINION','',packet.opinion.title)
  return lines.join('\n')
}
