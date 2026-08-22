import { neoHall, neoLibrarySeed, findNeoHallItems } from './neoHall'
import { neopedia, searchNeopedia } from './neopedia'
import { allNeopediaArticles, recursiveNeopediaStats } from './neopediaRecursive'
import { monitorSource, monitorSourceRecords } from './monitorConstitution'

export type NeoSyncDomain = 'HALL'|'LIBRARY'|'NEOPEDIA'|'MONITOR'
export type NeoSyncSnapshot = {
  generatedAt: string
  domains: NeoSyncDomain[]
  hall: typeof neoHall
  libraryCount: number
  neopediaCount: number
  generatedNeopediaCount: number
  neopediaReviewRequired: number
  monitorRecordCount: number
  integrityRules: readonly string[]
}

export const neoSync = {
  id: 'NEO-SYNC',
  title: 'NEO Sync',
  role: 'KNOWLEDGE_ORCHESTRATION_AND_PROVENANCE_SYNC',
  preferredNaming: {
    publicInstitution: 'NEO Hall',
    repository: 'NEO Library',
    encyclopedia: 'Neopedia'
  },
  syncOrder: ['PRIMARY_SOURCE','PROVENANCE','LIBRARY_INDEX','NEOPEDIA_ARTICLE','NOOGLE_DISCOVERY','NEO_ALGO_SYNTHESIS'] as const,
  integrityRules: [
    'Primary source is preserved before derivative summaries are generated.',
    'No derivative article may sever its provenance chain.',
    'Source-stated doctrine and NEO synthesis must remain distinguishable.',
    'Restricted sacred material may be indexed without exposing ritual detail publicly.',
    'Conflicting records coexist until the evidence graph resolves or preserves the dispute.',
    'Every revision must remain attributable and recoverable.',
    'Search relevance is not truth status.',
    'Recursive generation may create encyclopedia structure, but it may not upgrade a claim status beyond its source record.',
    'Objects without adequate source locators remain REVIEW_REQUIRED rather than silently appearing complete.'
  ] as const
}

export function buildNeoSyncSnapshot(date = new Date()): NeoSyncSnapshot {
  const stats = recursiveNeopediaStats()
  return {
    generatedAt: date.toISOString(),
    domains: ['HALL','LIBRARY','NEOPEDIA','MONITOR'],
    hall: neoHall,
    libraryCount: neoLibrarySeed.length,
    neopediaCount: allNeopediaArticles.length,
    generatedNeopediaCount: stats.generatedArticles,
    neopediaReviewRequired: stats.reviewRequired,
    monitorRecordCount: monitorSourceRecords.length,
    integrityRules: neoSync.integrityRules
  }
}

export function neoSyncSearch(query: string) {
  return {
    query,
    hall: findNeoHallItems(query),
    neopedia: searchNeopedia(query, allNeopediaArticles),
    monitor: monitorSourceRecords.filter(record => {
      const text = `${record.title} ${record.summary} ${record.tags.join(' ')}`.toLowerCase()
      return query.toLowerCase().split(/\s+/).filter(Boolean).every(term => text.includes(term))
    }),
    source: monitorSource
  }
}

export { neoHall, neopedia, allNeopediaArticles }
