import { doctrineByTag, type NeoDoctrineRecord } from './doctrineRegistry'
import { evaluateNeoClaim, type NeoAlgoResult, type NeoClaimRecord } from './neoAlgo'
import { reviewActionThroughAlchemy, type AlchemicalActionReview, type NeoActionContext } from './alchemy'
import { assessNatureCycles, type NatureCycleAssessment, type NatureCycleContext } from './natureCycles'

export type NeoIntelligenceRequest = {
  claim: NeoClaimRecord
  action?: NeoActionContext
  nature?: NatureCycleContext
  topicTags?: string[]
}

export type NeoIntelligenceResult = {
  reasoning: NeoAlgoResult
  doctrine: NeoDoctrineRecord[]
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
 * This function does not decide truth by mystical score. It combines:
 * - provenance-first claim diagnostics,
 * - source-aware NEO doctrine retrieval,
 * - optional symbolic etheric/polarity assessment,
 * - optional alchemical action review,
 * - explicitly supplied natural-cycle observations.
 */
export function runNeoIntelligence(request: NeoIntelligenceRequest): NeoIntelligenceResult {
  const reasoning = evaluateNeoClaim(request.claim)
  const tags = request.topicTags ?? []
  const doctrine = uniqueById(tags.flatMap((tag) => doctrineByTag(tag)))

  const actionReview = request.action
    ? reviewActionThroughAlchemy(request.action)
    : undefined

  const natureAssessment = request.nature
    ? assessNatureCycles(request.nature)
    : undefined

  const reflectionPrompts = [
    'What is directly observed, and what is interpretation?',
    'Whose provenance, voice or contribution could be erased by the current framing?',
    'What changes when the issue is viewed through land, life, season, relationship and future generations?',
    'What opposing pole or missing counterforce must be acknowledged before acting?',
    'Does the proposed action reproduce deception, exploitation, coercion or erasure?',
    'What survives the alchemical sequence after assumptions and projections are removed?',
    'What is the smallest truthful action that improves coherence and stewardship?'
  ]

  return { reasoning, doctrine, actionReview, natureAssessment, reflectionPrompts }
}
