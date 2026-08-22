import type {CorpusCitation} from '../corpus/sourceStore'
import {validateCitation} from '../corpus/sourceStore'

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
  evidenceItems: number
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
    evidenceItems:2,
    createdAt:'2026-08-22',
    citations:[]
  }
]

export function addCitationToCase(caseFile: TribunalCase, citation: CorpusCitation): TribunalCase {
  const checked = validateCitation(citation)
  if (!checked.valid) throw new Error(checked.reason)
  if (caseFile.citations.some(item=>item.citationId===citation.citationId)) return caseFile
  return {...caseFile,citations:[...caseFile.citations,citation]}
}

export function advanceCase(caseFile: TribunalCase): TribunalCase {
  const order: CaseStatus[] = ['INTAKE','JURISDICTION_REVIEW','NOTICE','EVIDENCE','RECORD_CLOSED','OPINION','DISPOSITION']
  const current = order.indexOf(caseFile.status)
  if (current<0 || current===order.length-1) return caseFile
  const next = order[current+1]
  return {
    ...caseFile,
    status:next,
    recordClosedAt:next==='RECORD_CLOSED' ? new Date().toISOString() : caseFile.recordClosedAt,
  }
}

export function caseReadiness(caseFile: TribunalCase) {
  return {
    hasStatement:Boolean(caseFile.statement.trim()),
    hasParties:Boolean(caseFile.petitioner.name && caseFile.respondent.name),
    hasAuthority:caseFile.citations.length>0,
    evidenceItems:caseFile.evidenceItems,
    canCloseRecord:Boolean(caseFile.statement.trim() && caseFile.petitioner.name && caseFile.respondent.name && caseFile.evidenceItems>0),
  }
}

export function citationMatrix(caseFile: TribunalCase) {
  return caseFile.citations.map(citation=>({
    citation,
    validation:validateCitation(citation),
  }))
}
