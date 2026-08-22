import { neoHall, neoLibrarySeed, findNeoHallItems } from './neoHall'
import { neopedia, neopediaSeedArticles, searchNeopedia } from './neopedia'
import { monitorSource, monitorSourceRecords } from './monitorConstitution'

export type NeoSyncDomain = 'HALL'|'LIBRARY'|'NEOPEDIA'|'MONITOR'
export type NeoSyncSnapshot = {
  generatedAt: string
  domains: NeoSyncDomain[]
  hall: typeof neoHall
  libraryCount: number
  neopediaCount: number
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
    'Search relevance is not truth status.'
  ] as const
}

export function buildNeoSyncSnapshot(date = new Date()): NeoSyncSnapshot {
  return {
    generatedAt: date.toISOString(),
    domains: ['HALL','LIBRARY','NEOPEDIA','MONITOR'],
    hall: neoHall,
    libraryCount: neoLibrarySeed.length,
    neopediaCount: neopediaSeedArticles.length,
    monitorRecordCount: monitorSourceRecords.length,
    integrityRules: neoSync.integrityRules
  }
}

export function neoSyncSearch(query: string) {
  return {
    query,
    hall: findNeoHallItems(query),
    neopedia: searchNeopedia(query),
    monitor: monitorSourceRecords.filter(record => {
      const text = `${record.title} ${record.summary} ${record.tags.join(' ')}`.toLowerCase()
      return query.toLowerCase().split(/\s+/).filter(Boolean).every(term => text.includes(term))
    }),
    source: monitorSource
  }
}

export { neoHall, neopedia }
