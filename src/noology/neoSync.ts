import { neoHall, neoLibrarySeed, findNeoHallItems } from './neoHall'
import { neopedia, searchNeopedia } from './neopedia'
import { allNeopediaArticles, recursiveNeopediaStats } from './neopediaRecursive'
import { monitorSource, monitorSourceRecords } from './monitorConstitution'
import { neoSelfLearning } from './continualLearning'
import { neoLearningSources, sourceFeedSeedObservations } from './sourceFeeds'
import { TEMPLIST_CURRICULUM_KNOWLEDGE } from './templistCurriculumKnowledge'
import { NEO_ORACLE_TEMPLIST_CONTEXT } from './neoOracleTemplistContext'
import { NEO_LAW_TEMPLIST_DOCTRINE } from './neoLawTemplistDoctrine'
import { NEO_SOCIETY_TEMPLIST_NORMS } from './neoSocietyTemplistNorms'
import { AUSARIAN_ECONOMIC_DOCTRINE } from './ausarianEconomicDoctrine'

export type NeoSyncDomain = 'HALL'|'LIBRARY'|'NEOPEDIA'|'MONITOR'|'LEARNING'|'CURRICULUM'|'ORACLE'|'LAW'|'SOCIETY'|'ECONOMICS'
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
  curriculumCanonId: string
  oracleContextId: string
  lawDoctrineId: string
  societyNormsId: string
  economicDoctrineId: string
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
    'High-impact conclusions require human review even when relation confidence is high.',
    'Templist curriculum doctrine must preserve exact user-supplied terminology, study lists, and Tests of Study when supplied.',
    'Internal Temple doctrine, NEO Law classification, and social norms remain distinct from external legal, scientific, medical, historical, accreditation, and credential claims.',
    'Ausarian Economic Philosophy is the canonical economic doctrine of the NEO System; its internal monetary classifications, ethical norms, and economic theories must remain distinct from conventional monetary statistics, empirical claims, accounting treatment, and external legal status.',
    'Economic doctrine may guide NEO Algo, NEO Oracle, GISS/GISD NEO LMS, NEO Law, NEO Society, and treasury/finance design, but may not by itself authorize regulated financial, lending, custody, securities, banking, tax, or investment actions.'
  ] as const
}

export function buildNeoSyncSnapshot(date = new Date()): NeoSyncSnapshot {
  const stats = recursiveNeopediaStats()
  return {
    generatedAt: date.toISOString(),
    domains: ['HALL','LIBRARY','NEOPEDIA','MONITOR','LEARNING','CURRICULUM','ORACLE','LAW','SOCIETY','ECONOMICS'],
    hall: neoHall,
    libraryCount: neoLibrarySeed.length,
    neopediaCount: allNeopediaArticles.length,
    generatedNeopediaCount: stats.generatedArticles,
    neopediaReviewRequired: stats.reviewRequired,
    monitorRecordCount: monitorSourceRecords.length,
    learningSourceCount: neoLearningSources.length,
    learningObservationCount: sourceFeedSeedObservations.length,
    learningPattern: neoSelfLearning.technicalPattern,
    curriculumCanonId: TEMPLIST_CURRICULUM_KNOWLEDGE.id,
    oracleContextId: NEO_ORACLE_TEMPLIST_CONTEXT.id,
    lawDoctrineId: NEO_LAW_TEMPLIST_DOCTRINE.id,
    societyNormsId: NEO_SOCIETY_TEMPLIST_NORMS.id,
    economicDoctrineId: AUSARIAN_ECONOMIC_DOCTRINE.id,
    integrityRules: neoSync.integrityRules
  }
}

function objectText(value: unknown) {
  return JSON.stringify(value).toLowerCase()
}

export function neoSyncSearch(query: string) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  const matches = (value: unknown) => terms.every(term => objectText(value).includes(term))
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
    curriculum: matches(TEMPLIST_CURRICULUM_KNOWLEDGE) ? [TEMPLIST_CURRICULUM_KNOWLEDGE] : [],
    oracleContext: matches(NEO_ORACLE_TEMPLIST_CONTEXT) ? [NEO_ORACLE_TEMPLIST_CONTEXT] : [],
    lawDoctrine: matches(NEO_LAW_TEMPLIST_DOCTRINE) ? [NEO_LAW_TEMPLIST_DOCTRINE] : [],
    societyNorms: matches(NEO_SOCIETY_TEMPLIST_NORMS) ? [NEO_SOCIETY_TEMPLIST_NORMS] : [],
    economicDoctrine: matches(AUSARIAN_ECONOMIC_DOCTRINE) ? [AUSARIAN_ECONOMIC_DOCTRINE] : [],
    source: monitorSource
  }
}

export {
  neoHall,
  neopedia,
  allNeopediaArticles,
  neoSelfLearning,
  TEMPLIST_CURRICULUM_KNOWLEDGE,
  NEO_ORACLE_TEMPLIST_CONTEXT,
  NEO_LAW_TEMPLIST_DOCTRINE,
  NEO_SOCIETY_TEMPLIST_NORMS,
  AUSARIAN_ECONOMIC_DOCTRINE,
}
