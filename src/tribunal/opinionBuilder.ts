import type {CorpusCitation} from '../corpus/sourceStore'
import {validateCitation} from '../corpus/sourceStore'
import type {EvidenceItem} from './evidenceEngine'

export type OpinionSectionKind = 'QUESTION_PRESENTED' | 'JURISDICTION' | 'FINDINGS' | 'AUTHORITIES' | 'ANALYSIS' | 'CONCLUSION' | 'DISPOSITION'

export interface OpinionSection {
  id: string
  kind: OpinionSectionKind
  heading: string
  body: string
  citationIds: string[]
  exhibitIds: string[]
}

export interface TribunalOpinion {
  opinionId: string
  claimNo: string
  title: string
  status: 'DRAFT' | 'REVIEW' | 'FINAL_INTERNAL'
  sections: OpinionSection[]
  createdAt: string
  updatedAt: string
  disclaimer: string
}

export const internalOpinionDisclaimer = 'This opinion is an internal Tribunal record and analysis. It does not by software declaration create external governmental jurisdiction, arrest power, property title, diplomatic recognition, or binding effect on persons or institutions outside an applicable lawful agreement or recognized jurisdiction.'

export function createOpinion(claimNo: string): TribunalOpinion {
  const stamp = new Date().toISOString()
  return {
    opinionId:`OP-${claimNo}`,
    claimNo,
    title:`NEOsync Tribunal Opinion — ${claimNo}`,
    status:'DRAFT',
    createdAt:stamp,
    updatedAt:stamp,
    disclaimer:internalOpinionDisclaimer,
    sections:[
      {id:'SEC-QUESTION',kind:'QUESTION_PRESENTED',heading:'Question Presented',body:'',citationIds:[],exhibitIds:[]},
      {id:'SEC-JURISDICTION',kind:'JURISDICTION',heading:'Jurisdiction and Scope',body:'',citationIds:[],exhibitIds:[]},
      {id:'SEC-FINDINGS',kind:'FINDINGS',heading:'Findings of Fact',body:'',citationIds:[],exhibitIds:[]},
      {id:'SEC-AUTHORITIES',kind:'AUTHORITIES',heading:'Authorities',body:'',citationIds:[],exhibitIds:[]},
      {id:'SEC-ANALYSIS',kind:'ANALYSIS',heading:'Analysis',body:'',citationIds:[],exhibitIds:[]},
      {id:'SEC-CONCLUSION',kind:'CONCLUSION',heading:'Conclusion',body:'',citationIds:[],exhibitIds:[]},
      {id:'SEC-DISPOSITION',kind:'DISPOSITION',heading:'Internal Disposition',body:'',citationIds:[],exhibitIds:[]},
    ]
  }
}

export function updateOpinionSection(opinion: TribunalOpinion, sectionId: string, patch: Partial<Pick<OpinionSection,'body'|'citationIds'|'exhibitIds'>>): TribunalOpinion {
  return {
    ...opinion,
    updatedAt:new Date().toISOString(),
    sections:opinion.sections.map(section=>section.id===sectionId?{...section,...patch}:section),
  }
}

export function validateOpinion(opinion: TribunalOpinion, citations: CorpusCitation[], evidence: EvidenceItem[]) {
  const citationIds = new Set(citations.map(c=>c.citationId))
  const exhibitIds = new Set(evidence.map(e=>e.exhibitId))
  const problems:string[]=[]
  for(const section of opinion.sections){
    for(const id of section.citationIds){
      if(!citationIds.has(id)) problems.push(`${section.heading}: citation ${id} is not attached to the case`)
      const citation=citations.find(c=>c.citationId===id)
      if(citation && !validateCitation(citation).valid) problems.push(`${section.heading}: citation ${id} failed Corpus validation`)
    }
    for(const id of section.exhibitIds){
      if(!exhibitIds.has(id)) problems.push(`${section.heading}: exhibit ${id} is not in the case record`)
    }
  }
  if(!opinion.sections.find(s=>s.kind==='ANALYSIS')?.body.trim()) problems.push('Analysis section is empty')
  if(!opinion.sections.find(s=>s.kind==='CONCLUSION')?.body.trim()) problems.push('Conclusion section is empty')
  return {valid:problems.length===0,problems}
}

export function renderOpinionText(opinion: TribunalOpinion, citations: CorpusCitation[], evidence: EvidenceItem[]) {
  const lines=[opinion.title,`Opinion ID: ${opinion.opinionId}`,`Status: ${opinion.status}`,'',opinion.disclaimer,'']
  for(const section of opinion.sections){
    lines.push(section.heading.toUpperCase(),section.body||'[Not yet drafted]')
    if(section.citationIds.length){
      lines.push('Authorities:')
      for(const id of section.citationIds){
        const c=citations.find(item=>item.citationId===id)
        if(c) lines.push(`- ${c.authorityId} / ${c.sourceId} — ${c.locator}: ${c.proposition}`)
      }
    }
    if(section.exhibitIds.length){
      lines.push('Exhibits:')
      for(const id of section.exhibitIds){
        const ex=evidence.find(item=>item.exhibitId===id)
        if(ex) lines.push(`- ${ex.exhibitId} — ${ex.title} [${ex.status}]`)
      }
    }
    lines.push('')
  }
  return lines.join('\n')
}
