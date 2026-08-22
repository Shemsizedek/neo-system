import type { RetrievalHit, RetrievalResponse } from './retrievalAdapters'
import type { SourceAuthorityTier, ResearchDomain } from './researchRouter'

export type EvidenceEntityType = 'PERSON'|'ORGANIZATION'|'INSTRUMENT'|'ADDRESS'|'PLACE'|'DOCUMENT'|'TRANSACTION'|'ASSET'|'EVENT'|'UNKNOWN'
export type FusionConflictType = 'DATE'|'NAME'|'ADDRESS'|'IDENTIFIER'|'STATUS'|'OWNERSHIP'|'SUCCESSION'|'VALUE'|'STATEMENT'|'OTHER'

export type EvidenceEntity = {
  id: string
  type: EvidenceEntityType
  canonicalLabel: string
  aliases: string[]
  identifiers: Record<string,string>
  sourceHitIds: string[]
  confidence: number
}

export type FusedEvidenceRecord = {
  id: string
  canonicalKey: string
  title: string
  domains: ResearchDomain[]
  sourceHitIds: string[]
  providers: string[]
  authorityBest: SourceAuthorityTier
  sourceUrls: string[]
  dates: string[]
  locators: string[]
  statements: string[]
  identifiers: Record<string,string[]>
  agreementScore: number
  disagreementScore: number
  duplicateCount: number
}

export type EvidenceConflict = {
  id: string
  type: FusionConflictType
  subjectKey: string
  values: Array<{ value: string; sourceHitIds: string[] }>
  severity: 'LOW'|'MEDIUM'|'HIGH'
  resolution: 'UNRESOLVED'|'PARTIAL'|'RESOLVED'
  notes: string[]
}

export type TemporalEvent = {
  id: string
  date: string
  title: string
  sourceHitIds: string[]
  domains: ResearchDomain[]
}

export type MissingLink = {
  id: string
  description: string
  relatedEntityIds: string[]
  relatedRecordIds: string[]
  priority: 'LOW'|'MEDIUM'|'HIGH'
}

export type EvidenceFusionResult = {
  rawHitCount: number
  fusedRecordCount: number
  duplicateHitsCollapsed: number
  entities: EvidenceEntity[]
  records: FusedEvidenceRecord[]
  conflicts: EvidenceConflict[]
  timeline: TemporalEvent[]
  missingLinks: MissingLink[]
  providerWarnings: Array<{providerId:string; warnings:string[]}>
  generatedAt: string
}

const tierRank: Record<SourceAuthorityTier,number> = {
  TIER_1_PRIMARY: 4,
  TIER_2_AUTHORITATIVE: 3,
  TIER_3_SECONDARY: 2,
  TIER_4_LEAD: 1
}

const clean = (value: string | undefined) => (value ?? '').trim().replace(/\s+/g,' ')
const norm = (value: string | undefined) => clean(value).toLowerCase().replace(/[^a-z0-9]+/g,' ' ).trim()
const uniq = <T>(values:T[]) => [...new Set(values)]
const hitId = (hit: RetrievalHit, index:number) => `${hit.providerId}:${hit.identifiers?.accession ?? hit.identifiers?.txid ?? hit.identifiers?.patentId ?? hit.identifiers?.doi ?? hit.identifiers?.archiveId ?? hit.identifiers?.openAlex ?? norm(hit.url) ?? index}`

function canonicalKey(hit: RetrievalHit) {
  const ids = hit.identifiers ?? {}
  for (const key of ['accession','txid','patentId','doi','archiveId','openAlex','cik','address']) {
    if (ids[key]) return `${key}:${norm(ids[key])}`
  }
  if (hit.url) return `url:${norm(hit.url)}`
  return `title:${norm(hit.title)}|date:${norm(hit.date)}`
}

function bestTier(hits: RetrievalHit[]): SourceAuthorityTier {
  return hits.reduce<SourceAuthorityTier>((best, hit) => tierRank[hit.authorityTier] > tierRank[best] ? hit.authorityTier : best, 'TIER_4_LEAD')
}

function extractEntities(hit: RetrievalHit, sourceHitId:string): EvidenceEntity[] {
  const entities: EvidenceEntity[] = []
  const ids = hit.identifiers ?? {}
  const title = clean(hit.title)
  const push = (type:EvidenceEntityType, label:string, identifiers:Record<string,string>={}) => {
    const canonicalLabel = clean(label)
    if (!canonicalLabel) return
    entities.push({ id:`ENT-${norm(`${type}-${canonicalLabel}`).replace(/\s+/g,'-')}`, type, canonicalLabel, aliases:[], identifiers, sourceHitIds:[sourceHitId], confidence: Object.keys(identifiers).length ? 0.95 : 0.65 })
  }
  if (ids.cik) push('ORGANIZATION', title, {cik:ids.cik})
  if (ids.accession) push('DOCUMENT', title, {accession:ids.accession})
  if (ids.txid) push('TRANSACTION', title, {txid:ids.txid})
  if (ids.address) push('ADDRESS', ids.address, {address:ids.address})
  if (ids.patentId) push('INSTRUMENT', title, {patentId:ids.patentId})
  if (ids.doi || ids.openAlex || ids.archiveId) push('DOCUMENT', title, Object.fromEntries(Object.entries(ids).filter(([,v])=>Boolean(v))))
  if (!entities.length && title) push('UNKNOWN', title)
  return entities
}

function mergeEntities(entities: EvidenceEntity[]): EvidenceEntity[] {
  const map = new Map<string,EvidenceEntity>()
  for (const entity of entities) {
    const idKey = Object.entries(entity.identifiers).sort().map(([k,v])=>`${k}:${norm(v)}`).join('|')
    const key = idKey || `${entity.type}:${norm(entity.canonicalLabel)}`
    const existing = map.get(key)
    if (!existing) { map.set(key,{...entity}); continue }
    existing.aliases = uniq([...existing.aliases, entity.canonicalLabel, ...entity.aliases]).filter(a=>norm(a)!==norm(existing.canonicalLabel))
    existing.sourceHitIds = uniq([...existing.sourceHitIds,...entity.sourceHitIds])
    existing.identifiers = {...existing.identifiers,...entity.identifiers}
    existing.confidence = Math.max(existing.confidence, entity.confidence)
  }
  return [...map.values()]
}

function buildConflict(record:FusedEvidenceRecord, type:FusionConflictType, values:string[]): EvidenceConflict | null {
  const distinct = uniq(values.map(clean).filter(Boolean))
  if (distinct.length <= 1) return null
  return {
    id:`CONFLICT-${record.id}-${type}`,
    type,
    subjectKey:record.canonicalKey,
    values:distinct.map(value=>({value,sourceHitIds:record.sourceHitIds})),
    severity: distinct.length > 2 ? 'HIGH' : 'MEDIUM',
    resolution:'UNRESOLVED',
    notes:['Conflicting values are preserved. Authority tier and chronology should be reviewed before resolution.']
  }
}

export function fuseRetrievalResponses(responses: RetrievalResponse[], generatedAt = new Date()): EvidenceFusionResult {
  const hitRows: Array<{hit:RetrievalHit; id:string}> = []
  responses.forEach(response => response.hits.forEach((hit,index)=>hitRows.push({hit,id:hitId(hit,index)})))
  const grouped = new Map<string,Array<{hit:RetrievalHit;id:string}>>()
  for (const row of hitRows) {
    const key = canonicalKey(row.hit)
    const bucket = grouped.get(key) ?? []
    bucket.push(row); grouped.set(key,bucket)
  }

  const records:FusedEvidenceRecord[] = [...grouped.entries()].map(([key,rows],index)=>{
    const hits = rows.map(r=>r.hit)
    const identifiers:Record<string,string[]> = {}
    for (const hit of hits) for (const [k,v] of Object.entries(hit.identifiers ?? {})) if (v) identifiers[k]=uniq([...(identifiers[k]??[]),v])
    const dates = uniq(hits.map(h=>clean(h.date)).filter(Boolean))
    const statements = uniq(hits.map(h=>clean(h.statement)).filter(Boolean))
    const titles = uniq(hits.map(h=>clean(h.title)).filter(Boolean))
    const providers = uniq(hits.map(h=>h.providerId))
    const agreementComponents = [dates.length<=1, titles.length<=1, Object.values(identifiers).every(v=>v.length<=1), statements.length<=1]
    const agreementScore = agreementComponents.filter(Boolean).length / agreementComponents.length
    return {
      id:`FUSED-${index+1}`,
      canonicalKey:key,
      title:titles[0] ?? 'Untitled evidence record',
      domains:uniq(hits.map(h=>h.domain)),
      sourceHitIds:rows.map(r=>r.id),
      providers,
      authorityBest:bestTier(hits),
      sourceUrls:uniq(hits.map(h=>h.url).filter(Boolean)),
      dates,
      locators:uniq(hits.map(h=>clean(h.locator)).filter(Boolean)),
      statements,
      identifiers,
      agreementScore,
      disagreementScore:1-agreementScore,
      duplicateCount:Math.max(0,hits.length-1)
    }
  })

  const conflicts:EvidenceConflict[] = []
  for (const record of records) {
    const dateConflict = buildConflict(record,'DATE',record.dates); if (dateConflict) conflicts.push(dateConflict)
    const titleConflict = buildConflict(record,'NAME',record.sourceHitIds.map(id=>hitRows.find(r=>r.id===id)?.hit.title ?? '')); if (titleConflict) conflicts.push(titleConflict)
    for (const [key,values] of Object.entries(record.identifiers)) {
      const c = buildConflict(record,'IDENTIFIER',values); if (c) { c.notes.push(`Identifier field: ${key}`); conflicts.push(c) }
    }
    const statementConflict = buildConflict(record,'STATEMENT',record.statements); if (statementConflict) conflicts.push(statementConflict)
  }

  const entities = mergeEntities(hitRows.flatMap(row=>extractEntities(row.hit,row.id)))
  const timeline:TemporalEvent[] = records.flatMap(record=>record.dates.map((date,index)=>({ id:`TIME-${record.id}-${index+1}`, date, title:record.title, sourceHitIds:record.sourceHitIds, domains:record.domains }))).sort((a,b)=>a.date.localeCompare(b.date))

  const missingLinks:MissingLink[] = []
  for (const entity of entities) {
    if (entity.sourceHitIds.length === 1 && Object.keys(entity.identifiers).length === 0) missingLinks.push({ id:`MISSING-${entity.id}`, description:`Entity '${entity.canonicalLabel}' appears in only one evidence hit and lacks a stable identifier. Seek independent entity resolution.`, relatedEntityIds:[entity.id], relatedRecordIds:[], priority:'MEDIUM' })
  }
  for (const conflict of conflicts.filter(c=>c.severity==='HIGH')) missingLinks.push({ id:`MISSING-${conflict.id}`, description:`High-severity ${conflict.type.toLowerCase()} conflict requires a resolving primary record or chronology link.`, relatedEntityIds:[], relatedRecordIds:[conflict.subjectKey], priority:'HIGH' })

  return {
    rawHitCount:hitRows.length,
    fusedRecordCount:records.length,
    duplicateHitsCollapsed:hitRows.length-records.length,
    entities,
    records,
    conflicts,
    timeline,
    missingLinks,
    providerWarnings:responses.filter(r=>r.warnings.length).map(r=>({providerId:r.providerId,warnings:r.warnings})),
    generatedAt:generatedAt.toISOString()
  }
}

export const neoEvidenceFusionEngine = {
  id:'NEO-EVIDENCE-FUSION',
  title:'NEO Evidence Fusion Engine',
  role:'ENTITY_RESOLUTION_DEDUPLICATION_CONFLICT_PRESERVATION_TEMPORAL_FUSION_AND_MISSING_LINK_DETECTION',
  pipeline:['RAW_RETRIEVAL','CANONICAL_KEYS','DEDUPLICATION','ENTITY_RESOLUTION','AUTHORITY_RECONCILIATION','CONFLICT_PRESERVATION','TEMPORAL_CHAIN','AGREEMENT_SCORING','MISSING_LINKS','DOSSIER_HANDOFF'] as const,
  principles:[
    'Fusion reduces duplication without erasing source identity.',
    'Conflicts remain explicit until resolving evidence is supplied.',
    'Authority tier informs review priority but does not automatically erase lower-tier contrary evidence.',
    'Entity resolution prefers stable identifiers over name similarity.',
    'Agreement across dependent copies is not treated as independent corroboration.',
    'Missing links become research tasks rather than guessed relationships.'
  ] as const
} as const
