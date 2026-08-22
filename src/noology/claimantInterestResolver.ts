import type { ProvenanceGraph, ProvenanceEdge, ProvenanceRelation } from './provenanceGraph'
import type { TitleAuditReport, TitlePartyRole } from './titleAuditor'

export type ClaimantType = 'PERSON'|'TRUST'|'ESTATE'|'ORGANIZATION'|'ISSUER'|'CUSTODIAN'|'BENEFICIARY'|'SUCCESSOR'|'WALLET'|'OFFICE'|'INSTITUTION'|'OTHER'
export type InterestType = 'LEGAL_TITLE'|'BENEFICIAL_INTEREST'|'CUSTODY'|'CONTROL'|'POSSESSION'|'ISSUANCE'|'SUCCESSION'|'ECONOMIC_BENEFIT'|'CLAIM_ONLY'|'UNKNOWN'
export type InterestStatus = 'DOCUMENTED'|'PARTIALLY_DOCUMENTED'|'ASSERTED'|'CONTESTED'|'UNRESOLVED'

export type ClaimantInput = {
  id: string
  label: string
  type: ClaimantType
  identifiers?: Record<string,string>
  assertedInterests?: InterestType[]
  assertedNodeId?: string
  notes?: string[]
}

export type ClaimantInterest = {
  claimantId: string
  claimantLabel: string
  nodeId?: string
  interests: InterestType[]
  status: InterestStatus
  supportingEdgeIds: string[]
  sourceRecordIds: string[]
  sourceHitIds: string[]
  confidence: number
  notes: string[]
}

export type InterestOverlap = {
  id: string
  claimantIds: string[]
  interestTypes: InterestType[]
  relation: 'COMPATIBLE'|'COMPETING'|'NESTED'|'UNKNOWN'
  severity: 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL'
  relatedEdgeIds: string[]
  description: string
}

export type ClaimantResolutionReport = {
  subjectAuditId?: string
  claimants: ClaimantInterest[]
  overlaps: InterestOverlap[]
  unresolvedClaimantIds: string[]
  competingClaimantIds: string[]
  followUpEvidenceRequests: string[]
  generatedAt: string
  boundary: string
}

const uniq = <T>(v:T[]) => [...new Set(v)]
const norm = (s:string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')

function relationToInterest(relation:ProvenanceRelation, direction:'FROM'|'TO'): InterestType[] {
  switch(relation) {
    case 'HELD_BY': return direction==='TO' ? ['CUSTODY','POSSESSION'] : ['CLAIM_ONLY']
    case 'CONTROLLED_BY': return direction==='TO' ? ['CONTROL'] : ['CLAIM_ONLY']
    case 'BENEFITS': return direction==='TO' ? ['ECONOMIC_BENEFIT','BENEFICIAL_INTEREST'] : ['CLAIM_ONLY']
    case 'ISSUED_BY': return direction==='TO' ? ['ISSUANCE'] : ['CLAIM_ONLY']
    case 'SUCCESSOR_OF': return direction==='FROM' ? ['SUCCESSION'] : ['CLAIM_ONLY']
    case 'ASSIGNED_TO':
    case 'TRANSFERRED_TO': return direction==='TO' ? ['LEGAL_TITLE'] : ['CLAIM_ONLY']
    case 'ORIGINATED_BY':
    case 'AUTHORED_BY': return direction==='TO' ? ['LEGAL_TITLE'] : ['CLAIM_ONLY']
    default: return ['UNKNOWN']
  }
}

function resolveNode(graph:ProvenanceGraph, claimant:ClaimantInput) {
  if (claimant.assertedNodeId) return graph.nodes.find(n=>n.id===claimant.assertedNodeId)
  const ids = Object.entries(claimant.identifiers ?? {})
  const byId = graph.nodes.find(node=>ids.some(([k,v])=>node.identifiers[k]?.toLowerCase()===v.toLowerCase()))
  if (byId) return byId
  const label = claimant.label.toLowerCase()
  return graph.nodes.find(n=>n.label.toLowerCase()===label || n.aliases.some(a=>a.toLowerCase()===label))
    ?? graph.nodes.find(n=>n.label.toLowerCase().includes(label) || label.includes(n.label.toLowerCase()))
}

function interestFromEdges(graph:ProvenanceGraph, nodeId:string) {
  const edges = graph.edges.filter(e=>e.from===nodeId || e.to===nodeId)
  const interests:InterestType[] = []
  for (const edge of edges) {
    if(edge.from===nodeId) interests.push(...relationToInterest(edge.relation,'FROM'))
    if(edge.to===nodeId) interests.push(...relationToInterest(edge.relation,'TO'))
  }
  return {edges, interests:uniq(interests.filter(i=>i!=='UNKNOWN'))}
}

function statusFromEdges(edges:ProvenanceEdge[], hasAsserted:boolean): InterestStatus {
  if (!edges.length) return hasAsserted ? 'ASSERTED' : 'UNRESOLVED'
  if (edges.some(e=>e.status==='CONTESTED'||e.status==='UNRESOLVED')) return 'CONTESTED'
  if (edges.every(e=>e.status==='DOCUMENTED')) return 'DOCUMENTED'
  if (edges.some(e=>e.status==='ASSERTED'||e.status==='INFERRED')) return 'PARTIALLY_DOCUMENTED'
  return 'UNRESOLVED'
}

function overlapRelation(a:ClaimantInterest,b:ClaimantInterest): InterestOverlap['relation'] {
  const shared = a.interests.filter(i=>b.interests.includes(i))
  if (!shared.length) return 'COMPATIBLE'
  const competing = shared.some(i=>['LEGAL_TITLE','BENEFICIAL_INTEREST','CONTROL','CUSTODY','SUCCESSION'].includes(i))
  return competing ? 'COMPETING' : 'NESTED'
}

export function resolveClaimantInterests(graph:ProvenanceGraph, claimants:ClaimantInput[], subjectAudit?:TitleAuditReport, generatedAt=new Date()): ClaimantResolutionReport {
  const resolved:ClaimantInterest[] = claimants.map(claimant=>{
    const node = resolveNode(graph,claimant)
    const inferred = node ? interestFromEdges(graph,node.id) : {edges:[] as ProvenanceEdge[],interests:[] as InterestType[]}
    const interests = uniq([...(claimant.assertedInterests ?? []),...inferred.interests])
    const status = statusFromEdges(inferred.edges,Boolean(claimant.assertedInterests?.length))
    const sourceRecordIds = uniq(inferred.edges.flatMap(e=>e.sourceRecordIds))
    const sourceHitIds = uniq(inferred.edges.flatMap(e=>e.sourceHitIds))
    const confidence = !node ? 0.2 : status==='DOCUMENTED' ? 0.9 : status==='PARTIALLY_DOCUMENTED' ? 0.7 : status==='CONTESTED' ? 0.45 : status==='ASSERTED' ? 0.35 : 0.25
    return {claimantId:claimant.id,claimantLabel:claimant.label,nodeId:node?.id,interests,status,supportingEdgeIds:inferred.edges.map(e=>e.id),sourceRecordIds,sourceHitIds,confidence,notes:claimant.notes ?? []}
  })

  const overlaps:InterestOverlap[] = []
  for(let i=0;i<resolved.length;i++) for(let j=i+1;j<resolved.length;j++) {
    const a=resolved[i], b=resolved[j]
    const relation=overlapRelation(a,b)
    if(relation==='COMPATIBLE' && !a.interests.length && !b.interests.length) continue
    const shared=uniq(a.interests.filter(x=>b.interests.includes(x)))
    const severity:InterestOverlap['severity'] = relation==='COMPETING'
      ? (shared.includes('LEGAL_TITLE')||shared.includes('BENEFICIAL_INTEREST') ? 'CRITICAL' : 'HIGH')
      : relation==='NESTED' ? 'MEDIUM' : 'LOW'
    overlaps.push({
      id:`OVERLAP-${norm(`${a.claimantId}-${b.claimantId}`)}`,
      claimantIds:[a.claimantId,b.claimantId],
      interestTypes:shared,
      relation,
      severity,
      relatedEdgeIds:uniq([...a.supportingEdgeIds,...b.supportingEdgeIds]),
      description: relation==='COMPETING'
        ? `${a.claimantLabel} and ${b.claimantLabel} have overlapping claims or documented interests that may compete.`
        : relation==='NESTED'
          ? `${a.claimantLabel} and ${b.claimantLabel} hold different or nested interests that should not be collapsed into ownership.`
          : `${a.claimantLabel} and ${b.claimantLabel} currently show no direct competing interest.`
    })
  }

  const unresolvedClaimantIds = resolved.filter(r=>!r.nodeId || r.status==='UNRESOLVED').map(r=>r.claimantId)
  const competingClaimantIds = uniq(overlaps.filter(o=>o.relation==='COMPETING').flatMap(o=>o.claimantIds))
  const followUpEvidenceRequests = uniq([
    ...resolved.filter(r=>!r.nodeId).map(r=>`Resolve ${r.claimantLabel} to a stable identifier or canonical graph node.`),
    ...resolved.filter(r=>r.status==='ASSERTED'||r.status==='PARTIALLY_DOCUMENTED').map(r=>`Obtain primary instruments establishing ${r.claimantLabel}'s asserted interest.`),
    ...overlaps.filter(o=>o.relation==='COMPETING').map(o=>`Obtain the governing instruments, chronology, capacity, and jurisdiction needed to resolve competing interests for ${o.claimantIds.join(' vs ')}.`),
    ...(subjectAudit?.defects ?? []).flatMap(d=>d.evidenceNeeded.map(need=>`Title-audit follow-up: ${need}`))
  ])

  return {
    subjectAuditId:subjectAudit?.auditId,
    claimants:resolved,
    overlaps,
    unresolvedClaimantIds,
    competingClaimantIds,
    followUpEvidenceRequests,
    generatedAt:generatedAt.toISOString(),
    boundary:'This resolver classifies evidentiary interests and conflicts. It does not adjudicate beneficial ownership, probate rights, fiduciary rights, wallet ownership, corporate authority, or legal title.'
  }
}

export const neoClaimantInterestResolver = {
  id:'NEO-CLAIMANT-INTEREST-RESOLVER',
  title:'NEO Claimant & Beneficial-Interest Resolver',
  role:'MULTI_CLAIMANT_INTEREST_OVERLAP_CONFLICT_AND_CAPACITY_ANALYSIS',
  sequence:['RESOLVE_CLAIMANTS','CLASSIFY_INTERESTS','SEPARATE_TITLE_FROM_CUSTODY_CONTROL_AND_BENEFIT','COMPARE_OVERLAPS','FLAG_COMPETING_INTERESTS','GENERATE_EVIDENCE_REQUESTS','HUMAN_REVIEW'] as const,
  principles:[
    'Legal title, beneficial interest, custody, control, possession, issuance and economic benefit are distinct.',
    'A wallet address or filing record is not automatically a beneficial owner.',
    'Competing claims remain visible until a governing instrument or authoritative determination resolves them.',
    'Stable identifiers and dated instruments outrank name similarity or institutional proximity.',
    'The resolver identifies intersections and gaps; it does not manufacture priority.'
  ] as const
} as const
