import { doctrineByTag, type NeoDoctrineRecord } from './doctrineRegistry'
import { evaluateNeoClaim, type NeoAlgoResult, type NeoClaimRecord } from './neoAlgo'
import { reviewActionThroughAlchemy, type AlchemicalActionReview, type NeoActionContext } from './alchemy'
import { assessNatureCycles, type NatureCycleAssessment, type NatureCycleContext } from './natureCycles'
import { searchNoologicalDisciplines, type NoologicalDiscipline } from './disciplines'
import { buildNoogleNoologicalPanel, type NoogleNoologicalPanel } from './noogleNoologicalSearch'
import { searchNovusCodexDoctrine } from './novusCodexDoctrine'

export type NeoIntelligenceRequest = {
  claim: NeoClaimRecord
  action?: NeoActionContext
  nature?: NatureCycleContext
  topicTags?: string[]
  doctrineQuery?: string
}

export type NeoIntelligenceResult = {
  reasoning: NeoAlgoResult
  doctrine: NeoDoctrineRecord[]
  disciplines: NoologicalDiscipline[]
  nooglePanel: NoogleNoologicalPanel
  actionReview?: AlchemicalActionReview
  natureAssessment?: NatureCycleAssessment
  reflectionPrompts: string[]
}

const uniqueById = <T extends { id: string }>(records: T[]): T[] => {
  const map = new Map<string, T>()
  for (const record of records) map.set(record.id, record)
  return [...map.values()]
}

/**
 * Single entry point for the NEO noological reasoning stack.
 *
 * This function does not decide truth by mystical score or search rank. It
 * combines provenance-first diagnostics, source-aware doctrine, NEO discipline
 * mapping, Noogle relevance ranking, optional alchemical action review and
 * explicitly supplied nature-cycle observations.
 */
export function runNeoIntelligence(request: NeoIntelligenceRequest): NeoIntelligenceResult {
  const reasoning = evaluateNeoClaim(request.claim)
  const tags = request.topicTags ?? []
  const query = request.doctrineQuery?.trim() || `${request.claim.statement} ${tags.join(' ')}`.trim()
  const doctrine = uniqueById([
    ...tags.flatMap((tag) => doctrineByTag(tag)),
    ...searchNovusCodexDoctrine(query)
  ])
  const disciplines = searchNoologicalDisciplines(query).slice(0, 8)
  const nooglePanel = buildNoogleNoologicalPanel(query)

  const actionReview = request.action
    ? reviewActionThroughAlchemy(request.action)
    : undefined

  const natureAssessment = request.nature
    ? assessNatureCycles(request.nature)
    : undefined

  const reflectionPrompts = [
    'What is directly observed, and what is interpretation?',
    'Which discipline is operating here: Factology, Noology, Noetics, Noogony, Neology, Noogenesis, or another NEO layer?',
    'Whose provenance, voice or contribution could be erased by the current framing?',
    'What changes when the issue is viewed through land, life, season, relationship and future generations?',
    'What opposing pole or missing counterforce must be acknowledged before acting?',
    'What time system is being used here: administrative/Gregorian, Nilotic/Natural, Yamassic, direct celestial observation, or another source-defined cycle?',
    'Does the proposed action reproduce deception, exploitation, coercion or erasure?',
    'What survives the alchemical sequence after assumptions and projections are removed?',
    'How does this insight contribute to noogenesis: the emergence of more coherent shared intelligence?',
    'What is the smallest truthful action that improves coherence and stewardship?'
  ]

  return {
    reasoning,
    doctrine,
    disciplines,
    nooglePanel,
    actionReview,
    natureAssessment,
    reflectionPrompts
  }
}
