import type { EvidenceFusionResult } from './evidenceFusion'
import { buildProvenanceGraph, assessProvenanceChain, type ProvenanceGraph, type ProvenanceRelation, type ProvenanceEdge, type ChainStatus } from './provenanceGraph'

export type TitleSubjectType =
  | 'LAND'
  | 'INTELLECTUAL_PROPERTY'
  | 'CULTURAL_PROPERTY'
  | 'ESTATE'
  | 'TRUST_INTEREST'
  | 'TOKEN_OR_DIGITAL_ASSET'
  | 'FINANCIAL_INSTRUMENT'
  | 'OFFICE_OR_TITLE'
  | 'DOCTRINE_OR_KNOWLEDGE'
  | 'DOCUMENT_OR_ARCHIVE'
  | 'OTHER'

export type TitleAuditStatus =
  | 'CLEAR_DOCUMENTED_CHAIN'
  | 'DOCUMENTED_WITH_GAPS'
  | 'CONTESTED_CHAIN'
  | 'ASSERTED_CHAIN_ONLY'
  | 'CIRCULAR_OR_DEPENDENT_CHAIN'
  | 'INSUFFICIENT_EVIDENCE'
  | 'NO_CHAIN_FOUND'

export type TitleDefectType =
  | 'MISSING_ORIGIN_INSTRUMENT'
  | 'MISSING_CONVEYANCE'
  | 'UNVERIFIED_ASSIGNMENT'
  | 'UNVERIFIED_SUCCESSION'
  | 'CONFLICTING_CLAIMANTS'
  | 'CONFLICTING_IDENTIFIERS'
  | 'CONFLICTING_DATES'
  | 'CONFLICTING_CUSTODY'
  | 'ASSERTED_ONLY_LINK'
  | 'CIRCULAR_PROVENANCE'
  | 'BROKEN_CHAIN'
  | 'UNRESOLVED_BENEFICIAL_INTEREST'
  | 'UNRESOLVED_AUTHORITY_OR_CAPACITY'
  | 'PROVENANCE_GAP'
  | 'OTHER'

export type TitleAuditSubject = {
  id: string
  label: string
  type: TitleSubjectType
  identifiers?: Record<string,string>
  assertedOriginNodeId?: string
  assertedPresentNodeId?: string
  requestedRelations?: ProvenanceRelation[]
  notes?: string[]
}

export type TitlePartyRole =
  | 'ORIGINATOR'
  | 'AUTHOR'
  | 'GRANTOR'
  | 'GRANTEE'
  | 'ASSIGNOR'
  | 'ASSIGNEE'
  | 'TRANSFEROR'
  | 'TRANSFEREE'
  | 'PREDECESSOR'
  | 'SUCCESSOR'
  | 'TRUSTEE_OR_CUSTODIAN'
  | 'BENEFICIARY'
  | 'CLAIMANT'
  | 'CURRENT_HOLDER'
  | 'ISSUER'
  | 'CONTROLLER'
  | 'UNKNOWN'

export type TitleParty = {
  nodeId: string
  label: string
  roles: TitlePartyRole[]
  identifiers: Record<string,string>
  sourceHitIds: string[]
}

export type ConveyanceStep = {
  sequence: number
  edgeId: string
  relation: ProvenanceRelation
  fromNodeId: string
  fromLabel: string
  toNodeId: string
  toLabel: string
  date?: string
  status: ProvenanceEdge['status']
  confidence: number
  sourceRecordIds: string[]
  sourceHitIds: string[]
  notes: string[]
}

export type TitleDefect = {
  id: string
  type: TitleDefectType
  severity: 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL'
  description: string
  relatedNodeIds: string[]
  relatedEdgeIds: string[]
  evidenceNeeded: string[]
}

export type TitleAuditReport = {
  auditId: string
  subject: TitleAuditSubject
  status: TitleAuditStatus
  chainStatus: ChainStatus
  completenessScore: number
  originNodeId?: string
  presentNodeId?: string
  parties: TitleParty[]
  conveyanceChain: ConveyanceStep[]
  defects: TitleDefect[]
  unresolvedQuestions: string[]
  sourceRecordIds: string[]
  sourceHitIds: string[]
  graphSnapshot: {
    nodeCount: number
    edgeCount: number
    cycleCount: number
    unresolvedNodeCount: number
  }
  generatedAt: string
  legalEffectBoundary: string
}

const uniq = <T>(values:T[]) => [...new Set(values)]
const norm = (value:string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')

const TITLE_RELATIONS: ProvenanceRelation[] = [
  'ORIGINATED_BY','AUTHORED_BY','ISSUED_BY','ASSIGNED_TO','TRANSFERRED_TO','SUCCESSOR_OF',
  'CONTROLLED_BY','HELD_BY','BENEFITS','DERIVED_FROM','SUPERSEDES'
]

function roleForRelation(relation:ProvenanceRelation, direction:'FROM'|'TO'): TitlePartyRole[] {
  switch (relation) {
    case 'ORIGINATED_BY': return direction==='TO' ? ['ORIGINATOR'] : ['CLAIMANT']
    case 'AUTHORED_BY': return direction==='TO' ? ['AUTHOR'] : ['CLAIMANT']
    case 'ISSUED_BY': return direction==='TO' ? ['ISSUER'] : ['CLAIMANT']
    case 'ASSIGNED_TO': return direction==='FROM' ? ['ASSIGNOR'] : ['ASSIGNEE']
    case 'TRANSFERRED_TO': return direction==='FROM' ? ['TRANSFEROR'] : ['TRANSFEREE']
    case 'SUCCESSOR_OF': return direction==='FROM' ? ['SUCCESSOR'] : ['PREDECESSOR']
    case 'HELD_BY': return direction==='TO' ? ['TRUSTEE_OR_CUSTODIAN','CURRENT_HOLDER'] : ['CLAIMANT']
    case 'BENEFITS': return direction==='TO' ? ['BENEFICIARY'] : ['CLAIMANT']
    case 'CONTROLLED_BY': return direction==='TO' ? ['CONTROLLER'] : ['CLAIMANT']
    default: return ['UNKNOWN']
  }
}

function chooseSubjectNode(graph:ProvenanceGraph, subject:TitleAuditSubject) {
  const idValues = Object.entries(subject.identifiers ?? {})
  const byIdentifier = graph.nodes.find(node => idValues.some(([k,v]) => node.identifiers[k]?.toLowerCase() === v.toLowerCase()))
  if (byIdentifier) return byIdentifier
  const label = subject.label.toLowerCase()
  return graph.nodes.find(node => node.label.toLowerCase()===label || node.aliases.some(alias=>alias.toLowerCase()===label))
    ?? graph.nodes.find(node => node.label.toLowerCase().includes(label) || label.includes(node.label.toLowerCase()))
}

function findDirectedPath(graph:ProvenanceGraph, start:string, end:string, allowed:ProvenanceRelation[]) {
  const queue:Array<{node:string;edges:ProvenanceEdge[]}> = [{node:start,edges:[]}]
  const visited = new Set<string>()
  while(queue.length) {
    const current = queue.shift()!
    if(current.node===end) return current.edges
    if(visited.has(current.node)) continue
    visited.add(current.node)
    for(const edge of graph.edges.filter(edge => edge.from===current.node && allowed.includes(edge.relation))) {
      queue.push({node:edge.to,edges:[...current.edges,edge]})
    }
  }
  return []
}

function inferEndpoints(graph:ProvenanceGraph, subjectNodeId:string, allowed:ProvenanceRelation[]) {
  const relevant = graph.edges.filter(edge => allowed.includes(edge.relation) && (edge.from===subjectNodeId || edge.to===subjectNodeId))
  const originLike = relevant.find(edge => ['ORIGINATED_BY','AUTHORED_BY','ISSUED_BY','DERIVED_FROM'].includes(edge.relation))
  const presentLike = [...relevant].reverse().find(edge => ['ASSIGNED_TO','TRANSFERRED_TO','SUCCESSOR_OF','HELD_BY','CONTROLLED_BY','BENEFITS'].includes(edge.relation))
  return {
    origin: originLike ? originLike.to : subjectNodeId,
    present: presentLike ? presentLike.to : subjectNodeId
  }
}

function statusFrom(chain:ChainStatus, defects:TitleDefect[]): TitleAuditStatus {
  if(chain==='BROKEN') return 'NO_CHAIN_FOUND'
  if(chain==='CIRCULAR') return 'CIRCULAR_OR_DEPENDENT_CHAIN'
  if(chain==='CONTESTED') return 'CONTESTED_CHAIN'
  if(chain==='ASSERTED_ONLY') return 'ASSERTED_CHAIN_ONLY'
  if(chain==='INSUFFICIENT_DATA') return defects.length ? 'DOCUMENTED_WITH_GAPS' : 'INSUFFICIENT_EVIDENCE'
  if(chain==='COMPLETE') return defects.some(d=>d.severity==='HIGH'||d.severity==='CRITICAL') ? 'DOCUMENTED_WITH_GAPS' : 'CLEAR_DOCUMENTED_CHAIN'
  return 'INSUFFICIENT_EVIDENCE'
}

function buildDefects(graph:ProvenanceGraph, chain:ProvenanceEdge[], chainStatus:ChainStatus, subject:TitleAuditSubject): TitleDefect[] {
  const defects:TitleDefect[] = []
  const push=(type:TitleDefectType,severity:TitleDefect['severity'],description:string,edges:ProvenanceEdge[]=[],nodes:string[]=[],evidenceNeeded:string[]=[])=>defects.push({
    id:`DEFECT-${norm(`${subject.id}-${type}-${defects.length+1}`)}`, type, severity, description,
    relatedNodeIds:uniq(nodes), relatedEdgeIds:edges.map(e=>e.id), evidenceNeeded
  })

  if(chainStatus==='BROKEN') push('BROKEN_CHAIN','CRITICAL','No continuous directed provenance path was found between the asserted origin and present endpoint.',[],[],['dated conveyance, assignment, succession, custody, or controlling instrument'])
  if(chainStatus==='CIRCULAR') push('CIRCULAR_PROVENANCE','HIGH','The selected provenance path participates in a cycle and cannot be treated as independent chain support.',chain,[],['independent primary record outside the circular citation/control path'])
  for(const edge of chain.filter(e=>e.status==='ASSERTED'||e.status==='INFERRED')) push('ASSERTED_ONLY_LINK','HIGH',`The ${edge.relation} link is asserted or inferred rather than directly documented.`,[edge],[edge.from,edge.to],['primary instrument or authoritative record establishing the relationship'])
  for(const edge of chain.filter(e=>e.status==='CONTESTED'||e.status==='UNRESOLVED')) push('PROVENANCE_GAP','HIGH',`The ${edge.relation} link remains contested or unresolved.`,[edge],[edge.from,edge.to],['resolving primary record, chronology, or adjudicated/authoritative determination'])

  const unresolved = new Set(graph.unresolvedNodeIds)
  for(const edge of chain.filter(e=>unresolved.has(e.from)||unresolved.has(e.to))) push('PROVENANCE_GAP','MEDIUM','A chain node is unresolved in Evidence Fusion.',[edge],[edge.from,edge.to],['stable identifier and independent entity-resolution record'])

  if(!chain.some(edge=>['ORIGINATED_BY','AUTHORED_BY','ISSUED_BY','DERIVED_FROM'].includes(edge.relation))) push('MISSING_ORIGIN_INSTRUMENT','HIGH','The chain does not contain a documented origin/authorship/issuance/derivation step.',chain,[],['originating instrument, authorship record, first issuance, or dated primary source'])
  if(chain.length>1 && !chain.some(edge=>['ASSIGNED_TO','TRANSFERRED_TO','SUCCESSOR_OF','HELD_BY'].includes(edge.relation))) push('MISSING_CONVEYANCE','HIGH','The chain lacks a documented conveyance, assignment, succession, or custody step between origin and present position.',chain,[],['assignment, deed, trust instrument, succession record, transfer record, or custody record'])

  return defects
}

function collectParties(graph:ProvenanceGraph, chain:ProvenanceEdge[]) {
  const map = new Map<string,TitleParty>()
  for(const edge of chain) {
    for(const [nodeId,direction] of [[edge.from,'FROM'],[edge.to,'TO']] as const) {
      const node = graph.nodes.find(n=>n.id===nodeId)
      if(!node) continue
      const roles = roleForRelation(edge.relation,direction)
      const existing = map.get(nodeId)
      if(existing) existing.roles = uniq([...existing.roles,...roles])
      else map.set(nodeId,{nodeId,label:node.label,roles,identifiers:node.identifiers,sourceHitIds:node.sourceHitIds})
    }
  }
  return [...map.values()]
}

export function auditTitleFromGraph(graph:ProvenanceGraph, subject:TitleAuditSubject, generatedAt=new Date()): TitleAuditReport {
  const subjectNode = chooseSubjectNode(graph,subject)
  const allowed = subject.requestedRelations?.length ? subject.requestedRelations : TITLE_RELATIONS
  const endpoints = subjectNode ? inferEndpoints(graph,subjectNode.id,allowed) : {origin:subject.assertedOriginNodeId,present:subject.assertedPresentNodeId}
  const originNodeId = subject.assertedOriginNodeId ?? endpoints.origin
  const presentNodeId = subject.assertedPresentNodeId ?? endpoints.present

  let chain:ProvenanceEdge[] = []
  let chainStatus:ChainStatus = 'INSUFFICIENT_DATA'
  let completenessScore = 0
  if(originNodeId && presentNodeId) {
    chain = findDirectedPath(graph,originNodeId,presentNodeId,allowed)
    const assessment = assessProvenanceChain(graph,originNodeId,presentNodeId)
    chainStatus = assessment.status
    completenessScore = assessment.completenessScore
  }
  if(!subjectNode && !chain.length) chainStatus='INSUFFICIENT_DATA'

  const defects = buildDefects(graph,chain,chainStatus,subject)
  if(!subjectNode) defects.unshift({
    id:`DEFECT-${norm(`${subject.id}-subject-unresolved`)}`,
    type:'PROVENANCE_GAP',severity:'CRITICAL',description:'The audit subject could not be resolved to a graph node by stable identifier or label.',
    relatedNodeIds:[],relatedEdgeIds:[],evidenceNeeded:['stable subject identifier, canonical source record, or explicit graph-node mapping']
  })

  const conveyanceChain:ConveyanceStep[] = chain.map((edge,index)=>({
    sequence:index+1, edgeId:edge.id, relation:edge.relation, fromNodeId:edge.from,
    fromLabel:graph.nodes.find(n=>n.id===edge.from)?.label ?? edge.from,
    toNodeId:edge.to, toLabel:graph.nodes.find(n=>n.id===edge.to)?.label ?? edge.to,
    date:edge.date,status:edge.status,confidence:edge.confidence,sourceRecordIds:edge.sourceRecordIds,sourceHitIds:edge.sourceHitIds,notes:edge.notes
  }))

  const unresolvedQuestions = defects.flatMap(defect=>defect.evidenceNeeded.map(need=>`What primary record can supply ${need}?`))
  const sourceRecordIds = uniq(chain.flatMap(edge=>edge.sourceRecordIds))
  const sourceHitIds = uniq(chain.flatMap(edge=>edge.sourceHitIds))

  return {
    auditId:`TITLE-AUDIT-${norm(subject.id)}`,
    subject,
    status:statusFrom(chainStatus,defects),
    chainStatus,
    completenessScore,
    originNodeId,
    presentNodeId,
    parties:collectParties(graph,chain),
    conveyanceChain,
    defects,
    unresolvedQuestions:uniq(unresolvedQuestions),
    sourceRecordIds,
    sourceHitIds,
    graphSnapshot:{nodeCount:graph.nodes.length,edgeCount:graph.edges.length,cycleCount:graph.cycles.length,unresolvedNodeCount:graph.unresolvedNodeIds.length},
    generatedAt:generatedAt.toISOString(),
    legalEffectBoundary:'This is an evidentiary provenance/title audit. It does not itself adjudicate ownership, probate rights, lien validity, intellectual-property rights, sovereign authority, or other legal effect. Those conclusions require the governing law, jurisdiction, instruments, and competent legal determination.'
  }
}

export function auditTitleFromFusion(fusion:EvidenceFusionResult, subject:TitleAuditSubject, generatedAt=new Date()) {
  return auditTitleFromGraph(buildProvenanceGraph(fusion,generatedAt),subject,generatedAt)
}

export const neoTitleAuditor = {
  id:'NEO-TITLE-AUDITOR',
  title:'NEO Chain-of-Title Auditor',
  role:'ORIGIN_TO_PRESENT_TITLE_PROVENANCE_SUCCESSION_CUSTODY_AND_DEFECT_AUDIT',
  acceptedSubjects:['LAND','INTELLECTUAL_PROPERTY','CULTURAL_PROPERTY','ESTATE','TRUST_INTEREST','TOKEN_OR_DIGITAL_ASSET','FINANCIAL_INSTRUMENT','OFFICE_OR_TITLE','DOCTRINE_OR_KNOWLEDGE','DOCUMENT_OR_ARCHIVE','OTHER'] as const,
  auditSequence:['RESOLVE_SUBJECT','IDENTIFY_ORIGIN','IDENTIFY_PRESENT_POSITION','TRACE_DIRECTED_CHAIN','ENUMERATE_PARTIES','ENUMERATE_CONVEYANCES','PRESERVE_CONFLICTS','CLASSIFY_DEFECTS','GENERATE_EVIDENCE_REQUESTS','REPORT_COMPLETENESS','HUMAN_LEGAL_REVIEW'] as const,
  principles:[
    'Stable identifiers and dated instruments outrank name or symbol similarity.',
    'Missing conveyances stay missing until a record establishes them.',
    'Possession, custody, filing, issuance, benefit and legal ownership are separate concepts.',
    'A blockchain record can establish an on-chain event without independently establishing off-chain legal title.',
    'A filing establishes what was filed and by whom; it does not automatically validate every underlying assertion.',
    'Asserted and contested links remain visible and reduce completeness.',
    'The auditor produces an evidence report, not an adjudication.'
  ] as const
} as const
