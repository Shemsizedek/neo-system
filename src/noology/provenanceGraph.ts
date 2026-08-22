import type { EvidenceEntity, EvidenceFusionResult, FusedEvidenceRecord } from './evidenceFusion'
import type { SourceAuthorityTier } from './researchRouter'

export type ProvenanceRelation =
  | 'ORIGINATED_BY'
  | 'AUTHORED_BY'
  | 'FILED_BY'
  | 'ISSUED_BY'
  | 'ASSIGNED_TO'
  | 'TRANSFERRED_TO'
  | 'SUCCESSOR_OF'
  | 'CONTROLLED_BY'
  | 'HELD_BY'
  | 'BENEFITS'
  | 'DERIVED_FROM'
  | 'CITES'
  | 'CORROBORATES'
  | 'CONTRADICTS'
  | 'SUPERSEDES'
  | 'PRECEDES'
  | 'FOLLOWS'
  | 'RELATED_TO'

export type ProvenanceNodeType = EvidenceEntity['type'] | 'EVIDENCE_RECORD' | 'CLAIM' | 'SOURCE'

export type ProvenanceNode = {
  id: string
  type: ProvenanceNodeType
  label: string
  aliases: string[]
  identifiers: Record<string,string>
  sourceHitIds: string[]
}

export type ProvenanceEdge = {
  id: string
  from: string
  to: string
  relation: ProvenanceRelation
  sourceRecordIds: string[]
  sourceHitIds: string[]
  authorityBest: SourceAuthorityTier
  confidence: number
  status: 'DOCUMENTED'|'INFERRED'|'ASSERTED'|'CONTESTED'|'UNRESOLVED'
  date?: string
  notes: string[]
}

export type ChainStatus = 'COMPLETE'|'BROKEN'|'CIRCULAR'|'ASSERTED_ONLY'|'CONTESTED'|'INSUFFICIENT_DATA'

export type ProvenanceChainAssessment = {
  id: string
  startNodeId: string
  endNodeId: string
  edgeIds: string[]
  status: ChainStatus
  completenessScore: number
  missingLinks: string[]
  contestedEdgeIds: string[]
  assertedEdgeIds: string[]
}

export type ProvenanceGraph = {
  nodes: ProvenanceNode[]
  edges: ProvenanceEdge[]
  chains: ProvenanceChainAssessment[]
  cycles: string[][]
  unresolvedNodeIds: string[]
  generatedAt: string
}

const uniq = <T>(values:T[]) => [...new Set(values)]
const norm = (value:string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')

function recordNode(record:FusedEvidenceRecord): ProvenanceNode {
  return {
    id:`REC-${norm(record.canonicalKey || record.id)}`,
    type:'EVIDENCE_RECORD',
    label:record.title,
    aliases:[],
    identifiers:Object.fromEntries(Object.entries(record.identifiers).flatMap(([k,v]) => v[0] ? [[k,v[0]]] : [])),
    sourceHitIds:record.sourceHitIds
  }
}

function entityNode(entity:EvidenceEntity): ProvenanceNode {
  return {
    id:entity.id,
    type:entity.type,
    label:entity.canonicalLabel,
    aliases:entity.aliases,
    identifiers:entity.identifiers,
    sourceHitIds:entity.sourceHitIds
  }
}

function inferRelation(record:FusedEvidenceRecord): ProvenanceRelation {
  const text = `${record.title} ${record.statements.join(' ')}`.toLowerCase()
  if (/assign|assignment/.test(text)) return 'ASSIGNED_TO'
  if (/transfer|convey/.test(text)) return 'TRANSFERRED_TO'
  if (/successor|succession/.test(text)) return 'SUCCESSOR_OF'
  if (/filed|filing/.test(text)) return 'FILED_BY'
  if (/issued|issuance/.test(text)) return 'ISSUED_BY'
  if (/author|written by|created by/.test(text)) return 'AUTHORED_BY'
  if (/origin|founded|established by/.test(text)) return 'ORIGINATED_BY'
  if (/control|controlled by|governed by/.test(text)) return 'CONTROLLED_BY'
  if (/held by|custodian|trustee/.test(text)) return 'HELD_BY'
  if (/derive|derived from|based on/.test(text)) return 'DERIVED_FROM'
  if (/contradict|dispute|conflict/.test(text)) return 'CONTRADICTS'
  if (/corroborat|confirm|supports/.test(text)) return 'CORROBORATES'
  return 'RELATED_TO'
}

function buildEdges(fusion:EvidenceFusionResult, nodes:ProvenanceNode[]): ProvenanceEdge[] {
  const recordMap = new Map(fusion.records.map(r => [r.id,r]))
  const out:ProvenanceEdge[] = []
  for (const record of fusion.records) {
    const rNode = recordNode(record)
    const connected = fusion.entities.filter(e => e.sourceHitIds.some(id => record.sourceHitIds.includes(id)))
    if (connected.length === 0) continue
    for (const entity of connected) {
      const contested = fusion.conflicts.some(c => c.subjectKey === record.canonicalKey && c.resolution !== 'RESOLVED')
      const relation = inferRelation(record)
      out.push({
        id:`EDGE-${norm(`${rNode.id}-${relation}-${entity.id}`)}`,
        from:rNode.id,
        to:entity.id,
        relation,
        sourceRecordIds:[record.id],
        sourceHitIds:record.sourceHitIds,
        authorityBest:record.authorityBest,
        confidence: contested ? 0.55 : record.agreementScore >= 0.75 ? 0.85 : 0.7,
        status: contested ? 'CONTESTED' : relation === 'RELATED_TO' ? 'ASSERTED' : 'DOCUMENTED',
        date:record.dates[0],
        notes: contested ? ['Underlying fused record contains unresolved conflict.'] : []
      })
    }
  }
  for (let i=0;i<fusion.timeline.length-1;i++) {
    const a = fusion.timeline[i], b = fusion.timeline[i+1]
    const aRecord = fusion.records.find(r => r.sourceHitIds.some(id => a.sourceHitIds.includes(id)))
    const bRecord = fusion.records.find(r => r.sourceHitIds.some(id => b.sourceHitIds.includes(id)))
    if (!aRecord || !bRecord || aRecord.id===bRecord.id) continue
    const from = recordNode(aRecord).id, to = recordNode(bRecord).id
    out.push({ id:`EDGE-${norm(`${from}-precedes-${to}-${i}`)}`, from, to, relation:'PRECEDES', sourceRecordIds:[aRecord.id,bRecord.id], sourceHitIds:uniq([...a.sourceHitIds,...b.sourceHitIds]), authorityBest:aRecord.authorityBest, confidence:0.8, status:'DOCUMENTED', date:a.date, notes:['Chronological relation generated from dated fused evidence.'] })
  }
  return uniq(out.map(e=>e.id)).map(id => out.find(e=>e.id===id)!).filter(e=>nodes.some(n=>n.id===e.from)&&nodes.some(n=>n.id===e.to))
}

function detectCycles(nodes:ProvenanceNode[], edges:ProvenanceEdge[]) {
  const adjacency = new Map<string,string[]>()
  for (const e of edges) adjacency.set(e.from,[...(adjacency.get(e.from)??[]),e.to])
  const cycles:string[][]=[]
  const visit=(node:string,path:string[])=>{
    const idx=path.indexOf(node)
    if(idx>=0){cycles.push([...path.slice(idx),node]);return}
    if(path.length>nodes.length) return
    for(const next of adjacency.get(node)??[]) visit(next,[...path,node])
  }
  for(const n of nodes) visit(n.id,[])
  const seen=new Set<string>()
  return cycles.filter(c=>{const key=[...new Set(c)].sort().join('|');if(seen.has(key))return false;seen.add(key);return true})
}

export function assessProvenanceChain(graph:Pick<ProvenanceGraph,'nodes'|'edges'|'cycles'>, startNodeId:string, endNodeId:string): ProvenanceChainAssessment {
  const queue:Array<{node:string;edgeIds:string[]}>=[{node:startNodeId,edgeIds:[]}]
  const visited=new Set<string>()
  let found:string[]|null=null
  while(queue.length){const cur=queue.shift()!;if(cur.node===endNodeId){found=cur.edgeIds;break}if(visited.has(cur.node))continue;visited.add(cur.node);for(const e of graph.edges.filter(e=>e.from===cur.node))queue.push({node:e.to,edgeIds:[...cur.edgeIds,e.id]})}
  if(!found) return {id:`CHAIN-${norm(`${startNodeId}-${endNodeId}`)}`,startNodeId,endNodeId,edgeIds:[],status:'BROKEN',completenessScore:0,missingLinks:[`No directed evidentiary path found from ${startNodeId} to ${endNodeId}.`],contestedEdgeIds:[],assertedEdgeIds:[]}
  const selected=found.map(id=>graph.edges.find(e=>e.id===id)!).filter(Boolean)
  const contested=selected.filter(e=>e.status==='CONTESTED'||e.status==='UNRESOLVED').map(e=>e.id)
  const asserted=selected.filter(e=>e.status==='ASSERTED'||e.status==='INFERRED').map(e=>e.id)
  const circular=graph.cycles.some(c=>c.includes(startNodeId)&&c.includes(endNodeId))
  const completeness=Math.max(0,1-(contested.length*0.25+asserted.length*0.15)/Math.max(1,selected.length))
  const status:ChainStatus = circular ? 'CIRCULAR' : contested.length ? 'CONTESTED' : asserted.length===selected.length ? 'ASSERTED_ONLY' : completeness>=0.9 ? 'COMPLETE' : 'INSUFFICIENT_DATA'
  return {id:`CHAIN-${norm(`${startNodeId}-${endNodeId}`)}`,startNodeId,endNodeId,edgeIds:found,status,completenessScore:Number(completeness.toFixed(3)),missingLinks:asserted.map(id=>`Edge ${id} requires stronger primary support.`),contestedEdgeIds:contested,assertedEdgeIds:asserted}
}

export function buildProvenanceGraph(fusion:EvidenceFusionResult, generatedAt=new Date()): ProvenanceGraph {
  const nodes=[...fusion.entities.map(entityNode),...fusion.records.map(recordNode)]
  const edges=buildEdges(fusion,nodes)
  const cycles=detectCycles(nodes,edges)
  const unresolvedNodeIds=uniq(fusion.missingLinks.flatMap(link=>link.relatedEntityIds))
  const chains:ProvenanceChainAssessment[]=[]
  for(const edge of edges.filter(e=>['ASSIGNED_TO','TRANSFERRED_TO','SUCCESSOR_OF','DERIVED_FROM','ORIGINATED_BY','AUTHORED_BY','ISSUED_BY'].includes(e.relation))) chains.push(assessProvenanceChain({nodes,edges,cycles},edge.from,edge.to))
  return {nodes,edges,chains,cycles,unresolvedNodeIds,generatedAt:generatedAt.toISOString()}
}

export const neoProvenanceGraphEngine = {
  id:'NEO-PROVENANCE-GRAPH',
  title:'NEO Provenance Graph Engine',
  role:'DIRECTED_CHAIN_OF_TITLE_ORIGIN_SUCCESSION_CUSTODY_AND_DERIVATION_ANALYSIS',
  relations:['ORIGINATED_BY','AUTHORED_BY','FILED_BY','ISSUED_BY','ASSIGNED_TO','TRANSFERRED_TO','SUCCESSOR_OF','CONTROLLED_BY','HELD_BY','BENEFITS','DERIVED_FROM','CITES','CORROBORATES','CONTRADICTS','SUPERSEDES','PRECEDES','FOLLOWS','RELATED_TO'] as const,
  principles:[
    'Every edge must preserve the records and hits that support it.',
    'A documented path is not the same thing as legal ownership or ultimate truth; scope remains source-bound.',
    'Contested and asserted links remain visible and reduce chain completeness.',
    'Circular provenance is flagged rather than mistaken for independent support.',
    'Missing links become research tasks, not inferred transfers.',
    'Stable identifiers and dated instruments outrank symbolic or lexical resemblance for chain construction.'
  ] as const
} as const
