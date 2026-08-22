import type {CorpusCitation} from '../corpus/sourceStore'
import {validateCitation} from '../corpus/sourceStore'
import type {EvidenceItem} from './evidenceEngine'

export type CaseStatus = 'INTAKE' | 'JURISDICTION_REVIEW' | 'NOTICE' | 'EVIDENCE' | 'RECORD_CLOSED' | 'OPINION' | 'DISPOSITION'
export type CaseType = 'TEMPLE_INJUSTICE' | 'CIVIL' | 'FAMILY' | 'FINANCE'

export interface TribunalParty {
  name: string
  council?: string
  location?: string
  email?: string
}

export interface TribunalCase {
  claimNo: string
  caseType: CaseType
  petitioner: TribunalParty
  respondent: TribunalParty
  statement: string
  status: CaseStatus
  citations: CorpusCitation[]
  evidence: EvidenceItem[]
  createdAt: string
  recordClosedAt?: string
}

export const tribunalCases: TribunalCase[] = [
  {
    claimNo:'WT-0001',
    caseType:'TEMPLE_INJUSTICE',
    petitioner:{name:'Sample Petitioner',council:'Temple Council',location:'Global District'},
    respondent:{name:'Sample Respondent',council:'Respondent Council',location:'Global District'},
    statement:'Demonstration docket for the Corpus-to-Tribunal citation workflow. No real-party determination is represented.',
    status:'JURISDICTION_REVIEW',
    createdAt:'2026-08-22',
    citations:[],
    evidence:[
      {
        exhibitId:'EX-001',title:'Demonstration filing',kind:'DOCUMENT',offeredBy:'PETITIONER',description:'Sample filing used to demonstrate the evidence registry.',status:'ADMITTED',integrity:'UNHASHED',tags:['demo'],
        custody:[{eventId:'EX-001-EV-001',at:'2026-08-22T00:00:00.000Z',actor:'E-File Intake',action:'RECEIVED',note:'Demonstration record.'}]
      },
      {
        exhibitId:'EX-002',title:'Demonstration response',kind:'CORRESPONDENCE',offeredBy:'RESPONDENT',description:'Sample response used to demonstrate adversarial recordkeeping.',status:'OFFERED',integrity:'UNHASHED',tags:['demo'],
        custody:[{eventId:'EX-002-EV-001',at:'2026-08-22T00:00:00.000Z',actor:'E-File Intake',action:'RECEIVED',note:'Demonstration record.'}]
      }
    ]
  }
]

export function addCitationToCase(caseFile: TribunalCase, citation: CorpusCitation): TribunalCase {
  const checked = validateCitation(citation)
  if (!checked.valid) throw new Error(checked.reason)
  if (caseFile.citations.some(item=>item.citationId===citation.citationId)) return caseFile
  return {...caseFile,citations:[...caseFile.citations,citation]}
}

export function addEvidenceToCase(caseFile: TribunalCase, evidence: EvidenceItem): TribunalCase {
  if(caseFile.evidence.some(item=>item.exhibitId===evidence.exhibitId)) throw new Error(`Duplicate exhibit ${evidence.exhibitId}`)
  return {...caseFile,evidence:[...caseFile.evidence,evidence]}
}

export function replaceEvidence(caseFile: TribunalCase, evidence: EvidenceItem): TribunalCase {
  return {...caseFile,evidence:caseFile.evidence.map(item=>item.exhibitId===evidence.exhibitId?evidence:item)}
}

export function advanceCase(caseFile: TribunalCase): TribunalCase {
  const order: CaseStatus[] = ['INTAKE','JURISDICTION_REVIEW','NOTICE','EVIDENCE','RECORD_CLOSED','OPINION','DISPOSITION']
  const current = order.indexOf(caseFile.status)
  if (current<0 || current===order.length-1) return caseFile
  const next = order[current+1]
  if(next==='RECORD_CLOSED' && !caseReadiness(caseFile).canCloseRecord) return caseFile
  return {
    ...caseFile,
    status:next,
    recordClosedAt:next==='RECORD_CLOSED' ? new Date().toISOString() : caseFile.recordClosedAt,
  }
}

export function caseReadiness(caseFile: TribunalCase) {
  const admissible = caseFile.evidence.filter(item=>item.status==='ADMITTED').length
  return {
    hasStatement:Boolean(caseFile.statement.trim()),
    hasParties:Boolean(caseFile.petitioner.name && caseFile.respondent.name),
    hasAuthority:caseFile.citations.length>0,
    evidenceItems:caseFile.evidence.length,
    admittedEvidence:admissible,
    canCloseRecord:Boolean(caseFile.statement.trim() && caseFile.petitioner.name && caseFile.respondent.name && caseFile.evidence.length>0),
  }
}

export function citationMatrix(caseFile: TribunalCase) {
  return caseFile.citations.map(citation=>({
    citation,
    validation:validateCitation(citation),
  }))
}
