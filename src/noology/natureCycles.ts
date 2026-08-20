export type NaturalCycleKind =
  | 'SEASONAL'
  | 'DIURNAL'
  | 'LUNAR'
  | 'SOLAR'
  | 'WATERSHED'
  | 'ECOLOGICAL'
  | 'BIOLOGICAL'
  | 'GENERATIONS'
  | 'INDIGENOUS_SEASONAL_KNOWLEDGE'

export type NaturalCycleObservation = {
  kind: NaturalCycleKind
  observedAt: string
  place?: string
  phase?: string
  observation: string
  source?: string
  communityOrTradition?: string
  confidence?: 'DIRECT_OBSERVATION' | 'COMMUNITY_KNOWLEDGE' | 'DOCUMENTED' | 'INFERRED'
}

export type NatureCycleContext = {
  observations: NaturalCycleObservation[]
  lifeSupportingSignals?: string[]
  stressSignals?: string[]
  renewalSignals?: string[]
}

export type NatureCycleAssessment = {
  observedKinds: NaturalCycleKind[]
  dominantPhase: 'REST' | 'EMERGENCE' | 'GROWTH' | 'HARVEST' | 'RELEASE' | 'MIXED' | 'UNKNOWN'
  cautions: string[]
  insights: string[]
}

const containsAny = (text: string, terms: string[]) => {
  const lowered = text.toLowerCase()
  return terms.some((term) => lowered.includes(term))
}

/**
 * Converts explicitly supplied nature observations into decision context.
 * It does not invent Indigenous seasonal knowledge or claim that a calendar
 * month has the same ecological meaning in every place.
 */
export function assessNatureCycles(context: NatureCycleContext): NatureCycleAssessment {
  const observedKinds = [...new Set(context.observations.map((item) => item.kind))]
  const joined = context.observations.map((item) => `${item.phase ?? ''} ${item.observation}`).join(' ')

  const scores: Record<Exclude<NatureCycleAssessment['dominantPhase'], 'MIXED' | 'UNKNOWN'>, number> = {
    REST: containsAny(joined, ['rest', 'dormant', 'still', 'winter', 'night', 'pause']) ? 1 : 0,
    EMERGENCE: containsAny(joined, ['emerge', 'bud', 'sprout', 'dawn', 'return', 'renew']) ? 1 : 0,
    GROWTH: containsAny(joined, ['grow', 'growth', 'flower', 'summer', 'expand', 'build']) ? 1 : 0,
    HARVEST: containsAny(joined, ['harvest', 'fruit', 'yield', 'gather', 'mature']) ? 1 : 0,
    RELEASE: containsAny(joined, ['release', 'shed', 'fall', 'autumn', 'decay', 'compost', 'waning']) ? 1 : 0
  }

  const high = Math.max(...Object.values(scores))
  const leaders = Object.entries(scores)
    .filter(([, score]) => score === high && score > 0)
    .map(([phase]) => phase as NatureCycleAssessment['dominantPhase'])

  const dominantPhase = leaders.length === 0 ? 'UNKNOWN' : leaders.length > 1 ? 'MIXED' : leaders[0]

  const cautions: string[] = []
  if (!context.observations.length) cautions.push('No direct natural-cycle observations were supplied.')
  if (context.observations.some((item) => item.kind === 'INDIGENOUS_SEASONAL_KNOWLEDGE' && !item.communityOrTradition)) {
    cautions.push('Indigenous seasonal knowledge must identify its community/tradition rather than being generalized.')
  }
  if (context.stressSignals?.length) cautions.push('Stress signals are present and should affect timing, extraction and reversibility decisions.')

  const insights: string[] = []
  if (dominantPhase === 'REST') insights.push('Favor observation, repair, conservation and preparation over forced expansion.')
  if (dominantPhase === 'EMERGENCE') insights.push('Favor small experiments, germination and reversible commitments.')
  if (dominantPhase === 'GROWTH') insights.push('Support development while watching carrying capacity and reciprocity.')
  if (dominantPhase === 'HARVEST') insights.push('Account for yield, distribute credit, preserve seed and return value to the system that produced it.')
  if (dominantPhase === 'RELEASE') insights.push('Retire what is exhausted, compost lessons, reduce accumulation and make room for renewal.')
  if (dominantPhase === 'MIXED') insights.push('Multiple natural phases are active; avoid a single-cycle interpretation.')

  return { observedKinds, dominantPhase, cautions, insights }
}
