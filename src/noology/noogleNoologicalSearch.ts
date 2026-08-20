import { neoDoctrineRegistry, type NeoDoctrineRecord } from './doctrineRegistry'
import { neoMaxims, type NeoMaxim } from './maxims'
import { noologicalDisciplines, type NoologicalDiscipline } from './disciplines'
import { sacredRecordsOfTheMoors, type SacredRecordOfMoorsEntry } from './sacredRecordsMoors'
import { sacredRecordsGraphNodes, sacredGraphNeighbors, type SacredGraphNode } from './sacredRecordsKnowledgeGraph'

export type NoogleNoologicalResultKind = 'DISCIPLINE' | 'DOCTRINE' | 'MAXIM' | 'SOURCE_RECORD' | 'KNOWLEDGE_GRAPH'

export type NoogleNoologicalResult = {
  id: string
  kind: NoogleNoologicalResultKind
  title: string
  summary: string
  score: number
  provenance: string
  tags: string[]
  sourceRefs: string[]
  graph?: {
    nodeType: string
    neighborCount: number
    relatedNodeIds: string[]
    sensitiveClassification?: boolean
  }
}

export type NoogleNoologicalQuery = {
  text: string
  limit?: number
  preferredDomains?: string[]
  includeSourceDerived?: boolean
  includeNeoSynthesis?: boolean
}

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9\-\s]/g, ' ')
const termsFor = (query: string) => [...new Set(normalize(query).split(/\s+/).filter(Boolean))]

function scoreText(queryTerms: string[], title: string, body: string, tags: string[]): number {
  if (!queryTerms.length) return 1
  const t = normalize(title)
  const b = normalize(body)
  const tagText = normalize(tags.join(' '))
  return queryTerms.reduce((score, term) => {
    if (t === term) return score + 12
    if (t.includes(term)) score += 7
    if (tagText.includes(term)) score += 4
    if (b.includes(term)) score += 2
    return score
  }, 0)
}

function disciplineResult(item: NoologicalDiscipline, terms: string[]): NoogleNoologicalResult {
  const tags = [...item.domains, ...item.related.map((x) => x.toLowerCase())]
  const body = `${item.definition} ${item.functionInNeoSystem} ${item.questions.join(' ')}`
  return { id:item.id, kind:'DISCIPLINE', title:item.name, summary:item.definition, score:scoreText(terms,item.name,body,tags)+3, provenance:item.provenanceClass, tags, sourceRefs:item.sourceRefs ?? [] }
}

function doctrineResult(item: NeoDoctrineRecord, terms: string[]): NoogleNoologicalResult {
  const body = `${item.teaching} ${item.operationalization}`
  return { id:item.id, kind:'DOCTRINE', title:item.title, summary:item.teaching, score:scoreText(terms,item.title,body,item.tags)+2, provenance:item.evidenceClass, tags:item.tags, sourceRefs:item.source ? [`${item.source.title}${item.source.pageOrSection ? ` — ${item.source.pageOrSection}` : ''}`] : [] }
}

function maximResult(item: NeoMaxim, terms: string[]): NoogleNoologicalResult {
  const tags = [item.domain]
  return { id:item.id, kind:'MAXIM', title:item.title, summary:item.statement, score:scoreText(terms,item.title,`${item.statement} ${item.operationalMeaning}`,tags)+1, provenance:'NEO_MAXIM', tags, sourceRefs:[] }
}

function sacredRecordResult(item: SacredRecordOfMoorsEntry, terms: string[]): NoogleNoologicalResult {
  const body = `${item.summary} ${item.sourceClaims.join(' ')} ${item.controls.join(' ')}`
  const sourceRef = `${item.source.title} — PDF p.${item.source.pdfPage}${item.source.printedPage ? ` / printed p.${item.source.printedPage}` : ''}${item.source.section ? ` — ${item.source.section}` : ''}`
  return { id:item.id, kind:'SOURCE_RECORD', title:item.title, summary:item.summary, score:scoreText(terms,item.title,body,item.tags)+4, provenance:item.evidenceClass, tags:item.tags, sourceRefs:[sourceRef] }
}

function graphResult(item: SacredGraphNode, terms: string[]): NoogleNoologicalResult {
  const neighbors = sacredGraphNeighbors(item.id)
  const aliasText = (item.aliases ?? []).join(' ')
  const body = `${aliasText} ${item.summary} ${neighbors.map(({edge,node}) => `${edge.relation} ${node.name}`).join(' ')}`
  return {
    id:item.id,
    kind:'KNOWLEDGE_GRAPH',
    title:item.name,
    summary:item.summary,
    score:scoreText(terms,item.name,body,item.tags)+5,
    provenance:'SOURCE_GRAPH',
    tags:[item.type.toLowerCase(), ...item.tags],
    sourceRefs:item.sourcePages.map((page) => `Let's Set The Record Straight! — PDF p.${page}`),
    graph:{ nodeType:item.type, neighborCount:neighbors.length, relatedNodeIds:neighbors.slice(0,12).map(({node}) => node.id), sensitiveClassification:item.sensitiveClassification }
  }
}

/**
 * Noogle's provenance-aware noological ranker. Relevance does not equal truth.
 * Source graph edges are searchable historical/source claims and remain visibly
 * classified rather than being promoted to independent fact by ranking.
 */
export function searchNoogleNoology(query: NoogleNoologicalQuery): NoogleNoologicalResult[] {
  const terms = termsFor(query.text)
  const preferred = new Set((query.preferredDomains ?? []).map(normalize))
  let results: NoogleNoologicalResult[] = [
    ...sacredRecordsGraphNodes.map((item) => graphResult(item, terms)),
    ...noologicalDisciplines.map((item) => disciplineResult(item, terms)),
    ...neoDoctrineRegistry.map((item) => doctrineResult(item, terms)),
    ...sacredRecordsOfTheMoors.map((item) => sacredRecordResult(item, terms)),
    ...neoMaxims.map((item) => maximResult(item, terms))
  ]

  if (query.includeSourceDerived === false) {
    results = results.filter((item) => item.provenance !== 'SOURCE_DERIVED' && !item.provenance.startsWith('SOURCE_'))
  }
  if (query.includeNeoSynthesis === false) results = results.filter((item) => !item.provenance.includes('SYNTHESIS'))

  results = results.map((result) => ({
    ...result,
    score: result.score + result.tags.reduce((bonus, tag) => bonus + (preferred.has(normalize(tag)) ? 3 : 0), 0)
  }))

  return results.filter((item) => terms.length === 0 || item.score > 0).sort((a,b) => b.score-a.score || a.title.localeCompare(b.title)).slice(0,Math.max(1,query.limit ?? 12))
}

export type NoogleNoologicalPanel = {
  query: string
  topResult?: NoogleNoologicalResult
  graphNodes: NoogleNoologicalResult[]
  relatedDisciplines: NoogleNoologicalResult[]
  doctrine: NoogleNoologicalResult[]
  sacredRecords: NoogleNoologicalResult[]
  maxims: NoogleNoologicalResult[]
  provenanceClasses: string[]
}

export function buildNoogleNoologicalPanel(text: string): NoogleNoologicalPanel {
  const results = searchNoogleNoology({ text, limit: 48 })
  return {
    query:text,
    topResult:results[0],
    graphNodes:results.filter((item) => item.kind === 'KNOWLEDGE_GRAPH').slice(0,12),
    relatedDisciplines:results.filter((item) => item.kind === 'DISCIPLINE').slice(0,6),
    doctrine:results.filter((item) => item.kind === 'DOCTRINE').slice(0,8),
    sacredRecords:results.filter((item) => item.kind === 'SOURCE_RECORD').slice(0,8),
    maxims:results.filter((item) => item.kind === 'MAXIM').slice(0,6),
    provenanceClasses:[...new Set(results.map((item) => item.provenance))]
  }
}
