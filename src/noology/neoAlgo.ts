import { neoMaxims, type NeoMaxim } from './maxims'

export type NeoEpistemicLens =
  | 'NEO_INDIGENOUS_HERMENEUTIC'
  | 'DOCUMENTARY_TECHNICAL'
  | 'EXTERNAL_RECOGNITION'

export type NeoEvidenceStatus =
  | 'SOURCE_ASSERTED'
  | 'DOCUMENTED'
  | 'TECHNICALLY_OBSERVED'
  | 'INDEPENDENTLY_CORROBORATED'
  | 'DISPUTED'
  | 'OPEN'

export type NoologicalHangup =
  | 'LOGOS_ONLY'
  | 'EXTERNAL_VALIDATION_GATE'
  | 'PROVENANCE_ERASURE'
  | 'TEMPORAL_ERASURE'
  | 'CATEGORY_COLLAPSE'
  | 'NATURE_DISCONNECTION'
  | 'SUCCESSION_BLINDNESS'
  | 'AUTHORITY_SUBSTITUTION'

export type NeoClaimRecord = {
  id: string
  statement: string
  speakerOrTradition?: string
  evidenceStatus: NeoEvidenceStatus
  evidenceRefs?: string[]
  indigenousSelfInterpretationPresent?: boolean
  provenancePresent?: boolean
  chronologyPresent?: boolean
  natureContextPresent?: boolean
  successionContextPresent?: boolean
  externalRecognitionRelevant?: boolean
  externalRecognitionPresent?: boolean
  mixesDoctrineFactLawOrValuation?: boolean
}

export type NeoAlgoResult = {
  claimId: string
  lensOrder: NeoEpistemicLens[]
  hangups: NoologicalHangup[]
  maximsActivated: NeoMaxim[]
  directives: string[]
}

const addUnique = <T>(items: T[], value: T) => {
  if (!items.includes(value)) items.push(value)
}

/**
 * NEO Algo is a diagnostic reasoning layer, not an oracle.
 *
 * Its job is to prevent a recurring failure mode: allowing formal institutional
 * recognition (logos-only analysis) to erase provenance, Indigenous
 * self-interpretation, chronology, ecological context, succession or category
 * distinctions. It preserves those layers first, then asks whether external
 * recognition is relevant to the task at hand.
 */
export function evaluateNeoClaim(claim: NeoClaimRecord): NeoAlgoResult {
  const hangups: NoologicalHangup[] = []
  const directives: string[] = []
  const activatedIds = new Set<string>()

  const activate = (id: string) => activatedIds.add(id)

  if (!claim.provenancePresent) {
    addUnique(hangups, 'PROVENANCE_ERASURE')
    directives.push('Recover authorship, source lineage, predecessor records and chain of custody before collapsing the claim into a present-day label.')
    activate('NMX-002')
    activate('NMX-006')
    activate('NMX-012')
  }

  if (!claim.chronologyPresent) {
    addUnique(hangups, 'TEMPORAL_ERASURE')
    directives.push('Build the chronology: origin, transmission, modification, succession, operationalization and present use.')
    activate('NMX-002')
    activate('NMX-012')
  }

  if (!claim.indigenousSelfInterpretationPresent) {
    addUnique(hangups, 'AUTHORITY_SUBSTITUTION')
    directives.push('Record the community or tradition’s own hermeneutic before substituting an outside interpretive authority.')
    activate('NMX-004')
    activate('NMX-012')
  }

  if (!claim.natureContextPresent) {
    addUnique(hangups, 'NATURE_DISCONNECTION')
    directives.push('Add biospheric, ecological, seasonal, embodied and stewardship context when the claim concerns land, life, value, law or restoration.')
    activate('NMX-001')
    activate('NMX-008')
    activate('NMX-011')
  }

  if (!claim.successionContextPresent) {
    addUnique(hangups, 'SUCCESSION_BLINDNESS')
    directives.push('Check predecessor and successor relationships, inherited benefits, duties, liabilities and institutional continuity.')
    activate('NMX-003')
  }

  if (claim.mixesDoctrineFactLawOrValuation) {
    addUnique(hangups, 'CATEGORY_COLLAPSE')
    directives.push('Separate doctrine, historical assertion, technical observation, legal effect, ownership, quantity, price, liquidity and valuation into distinct fields.')
    activate('NMX-005')
    activate('NMX-007')
  }

  if (claim.externalRecognitionRelevant && !claim.externalRecognitionPresent) {
    directives.push('External recognition is relevant to this specific task; mark it OPEN rather than using its absence to erase the internal NEO interpretation or documentary record.')
    activate('NMX-007')
  }

  if (!claim.externalRecognitionRelevant && claim.externalRecognitionPresent) {
    addUnique(hangups, 'EXTERNAL_VALIDATION_GATE')
    directives.push('Do not make external consensus a gatekeeper when the task is internal interpretation, provenance reconstruction or NEO doctrine.')
    activate('NMX-002')
    activate('NMX-012')
  }

  if (hangups.includes('EXTERNAL_VALIDATION_GATE') || hangups.includes('AUTHORITY_SUBSTITUTION')) {
    addUnique(hangups, 'LOGOS_ONLY')
    directives.push('Shift from logos-only processing to noological processing: preserve reason and text while restoring nature, provenance, lived continuity, conscience and relational context.')
    activate('NMX-010')
    activate('NMX-011')
  }

  const lensOrder: NeoEpistemicLens[] = [
    'NEO_INDIGENOUS_HERMENEUTIC',
    'DOCUMENTARY_TECHNICAL',
    'EXTERNAL_RECOGNITION'
  ]

  return {
    claimId: claim.id,
    lensOrder,
    hangups,
    maximsActivated: neoMaxims.filter((maxim) => activatedIds.has(maxim.id)),
    directives
  }
}

export function neoAlgoSummary(result: NeoAlgoResult): string {
  const hangups = result.hangups.length ? result.hangups.join(', ') : 'NONE'
  const maxims = result.maximsActivated.map((maxim) => maxim.id).join(', ') || 'NONE'
  return `NEO Algo ${result.claimId}: hangups=${hangups}; maxims=${maxims}`
}
