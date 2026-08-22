import { neoHall, neoLibrarySeed, findNeoHallItems } from './neoHall'
import { neopedia, searchNeopedia } from './neopedia'
import { allNeopediaArticles, recursiveNeopediaStats } from './neopediaRecursive'
import { monitorSource, monitorSourceRecords } from './monitorConstitution'
import { neoSelfLearning } from './continualLearning'
import { neoLearningSources, sourceFeedSeedObservations } from './sourceFeeds'

export type NeoSyncDomain = 'HALL'|'LIBRARY'|'NEOPEDIA'|'MONITOR'|'LEARNING'
export type NeoSyncSnapshot = {
  generatedAt: string
  domains: NeoSyncDomain[]
  hall: typeof neoHall
  libraryCount: number
  neopediaCount: number
  generatedNeopediaCount: number
  neopediaReviewRequired: number
  monitorRecordCount: number
  learningSourceCount: number
  learningObservationCount: number
  learningPattern: string
  integrityRules: readonly string[]
}

export const neoSync = {
  id: 'NEO-SYNC',
  title: 'NEO Sync',
  role: 'KNOWLEDGE_ORCHESTRATION_PROVENANCE_SYNC_AND_CONTINUAL_LEARNING',
  preferredNaming: {
    publicInstitution: 'NEO Hall',
    repository: 'NEO Library',
    encyclopedia: 'Neopedia'
  },
  syncOrder: ['PRIMARY_SOURCE','SNAPSHOT','PROVENANCE','OBSERVATION','RELATION_CANDIDATES','CONFLICT_CHECK','LIBRARY_INDEX','NEOPEDIA_ARTICLE','NOOGLE_DISCOVERY','NEO_ALGO_SYNTHESIS','CONSEQUENCE_REVIEW'] as const,
  integrityRules: [
    'Primary source is preserved before derivative summaries are generated.',
    'No derivative article may sever its provenance chain.',
    'Source-stated doctrine and NEO synthesis must remain distinguishable.',
    'Restricted sacred material may be indexed without exposing ritual detail publicly.',
    'Conflicting records coexist until the evidence graph resolves or preserves the dispute.',
    'Every revision must remain attributable and recoverable.',
    'Search relevance is not truth status.',
    'Recursive generation may create encyclopedia structure, but it may not upgrade a claim status beyond its source record.',
    'Objects without adequate source locators remain REVIEW_REQUIRED rather than silently appearing complete.',
    'Continual learning improves retrieval and graph relations without destructively rewriting protected source records.',
    'High-impact conclusions require human review even when relation confidence is high.'
  ] as const
}

export function buildNeoSyncSnapshot(date = new Date()): NeoSyncSnapshot {
  const stats = recursiveNeopediaStats()
  return {
    generatedAt: date.toISOString(),
    domains: ['HALL','LIBRARY','NEOPEDIA','MONITOR','LEARNING'],
    hall: neoHall,
    libraryCount: neoLibrarySeed.length,
    neopediaCount: allNeopediaArticles.length,
    generatedNeopediaCount: stats.generatedArticles,
    neopediaReviewRequired: stats.reviewRequired,
    monitorRecordCount: monitorSourceRecords.length,
    learningSourceCount: neoLearningSources.length,
    learningObservationCount: sourceFeedSeedObservations.length,
    learningPattern: neoSelfLearning.technicalPattern,
    integrityRules: neoSync.integrityRules
  }
}

export function neoSyncSearch(query: string) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  return {
    query,
    hall: findNeoHallItems(query),
    neopedia: searchNeopedia(query, allNeopediaArticles),
    monitor: monitorSourceRecords.filter(record => {
      const text = `${record.title} ${record.summary} ${record.tags.join(' ')}`.toLowerCase()
      return terms.every(term => text.includes(term))
    }),
    learningSources: neoLearningSources.filter(source => {
      const text = `${source.title} ${source.url ?? ''} ${source.authorityScope.join(' ')}`.toLowerCase()
      return terms.every(term => text.includes(term))
    }),
    observations: sourceFeedSeedObservations.filter(observation => {
      const text = `${observation.title} ${observation.statement} ${observation.tags.join(' ')}`.toLowerCase()
      return terms.every(term => text.includes(term))
    }),
    source: monitorSource
  }
}

export { neoHall, neopedia, allNeopediaArticles, neoSelfLearning }
