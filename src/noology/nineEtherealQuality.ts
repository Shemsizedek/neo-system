export type NineEtherealDimension =
  | 'PROVENANCE'
  | 'TRUTHFULNESS'
  | 'SOUND_RIGHT_REASON'
  | 'COHERENCE'
  | 'ETHICS'
  | 'RECIPROCITY'
  | 'NATURE_ALIGNMENT'
  | 'CRAFTSMANSHIP'
  | 'CONSEQUENCE'

export type NineEtherealInput = {
  sourceRefs?: string[]
  distinguishesSourceFromSynthesis?: boolean
  claimsQualified?: boolean
  contradictionsPreserved?: boolean
  reasoningStepsVisible?: boolean
  internallyConsistent?: boolean
  respectsRightsAndDignity?: boolean
  reciprocalBenefit?: boolean
  considersLivingSystems?: boolean
  editorialQuality?: number
  consequenceReview?: boolean
  unresolvedRisks?: string[]
}

export type NineEtherealScore = {
  dimension: NineEtherealDimension
  score: number
  rationale: string
}

export type NineEtherealAssessment = {
  scores: NineEtherealScore[]
  total: number
  average: number
  potency: '6_ETHER_CONTRACTIVE'|'DYNAMIC_BALANCE'|'9_ETHER_COHERENT'
  gate: 'PASS'|'REVIEW'|'HOLD'
  unresolvedRisks: string[]
}

const clamp9 = (value: number) => Math.max(0, Math.min(9, Number.isFinite(value) ? value : 0))
const yesNo = (value: boolean | undefined, yes = 9, no = 3) => value === true ? yes : value === false ? no : 5

/**
 * NEO 9-Ethereal Quality Engine.
 * Scores OUTPUTS, RECORDS, PROJECTS AND ACTIONS — never human worth, race,
 * religion, identity, biological traits or protected characteristics.
 */
export function assessNineEtherealQuality(input: NineEtherealInput): NineEtherealAssessment {
  const refs = input.sourceRefs?.filter(Boolean) ?? []
  const risks = input.unresolvedRisks ?? []
  const scores: NineEtherealScore[] = [
    { dimension: 'PROVENANCE', score: refs.length ? (input.distinguishesSourceFromSynthesis ? 9 : 7) : 2, rationale: refs.length ? 'Source chain is present.' : 'No source chain supplied.' },
    { dimension: 'TRUTHFULNESS', score: yesNo(input.claimsQualified), rationale: 'Measures whether claims are qualified to their actual evidence status.' },
    { dimension: 'SOUND_RIGHT_REASON', score: yesNo(input.reasoningStepsVisible), rationale: 'Measures visible reason, sequence and explanatory sufficiency.' },
    { dimension: 'COHERENCE', score: yesNo(input.internallyConsistent), rationale: 'Measures internal consistency while allowing explicit unresolved contradictions.' },
    { dimension: 'ETHICS', score: yesNo(input.respectsRightsAndDignity), rationale: 'Measures rights, dignity, non-exploitation and responsible use.' },
    { dimension: 'RECIPROCITY', score: yesNo(input.reciprocalBenefit), rationale: 'Measures mutual benefit and avoidance of one-sided extraction.' },
    { dimension: 'NATURE_ALIGNMENT', score: yesNo(input.considersLivingSystems), rationale: 'Measures consideration of natural cycles and effects on living systems.' },
    { dimension: 'CRAFTSMANSHIP', score: clamp9(input.editorialQuality ?? 5), rationale: 'Measures clarity, completeness, structure and technical/editorial finish.' },
    { dimension: 'CONSEQUENCE', score: yesNo(input.consequenceReview), rationale: 'Measures whether downstream consequences and unresolved risks were reviewed.' }
  ]

  if (input.contradictionsPreserved === false) {
    const item = scores.find(x => x.dimension === 'TRUTHFULNESS')!
    item.score = Math.min(item.score, 4)
    item.rationale += ' Contradictions were not preserved.'
  }

  const total = scores.reduce((sum, item) => sum + item.score, 0)
  const average = total / scores.length
  const criticalFloor = Math.min(...scores.map(x => x.score))
  const potency: NineEtherealAssessment['potency'] = average >= 7.5 ? '9_ETHER_COHERENT' : average <= 4.5 ? '6_ETHER_CONTRACTIVE' : 'DYNAMIC_BALANCE'
  const gate: NineEtherealAssessment['gate'] = risks.length || criticalFloor < 4 ? 'HOLD' : average >= 7 ? 'PASS' : 'REVIEW'

  return { scores, total, average, potency, gate, unresolvedRisks: risks }
}

export const nineEtherealQualityEngine = {
  id: 'NEO-9-ETHEREAL-QUALITY',
  title: 'NEO 9 Ethereal Quality Engine',
  purpose: 'Apply a nine-dimensional quality gate to NEO research, media, projects, contracts, software, knowledge records and proposed actions before promotion or publication.',
  dimensions: ['PROVENANCE','TRUTHFULNESS','SOUND_RIGHT_REASON','COHERENCE','ETHICS','RECIPROCITY','NATURE_ALIGNMENT','CRAFTSMANSHIP','CONSEQUENCE'] as const,
  boundary: 'This engine scores artifacts and actions, not human beings or protected characteristics.'
} as const
