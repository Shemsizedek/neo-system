import { neoMaxims, type NeoMaxim } from './maxims'
import { analyzeSmatPhase, type SmatPhase, type SmatCycleAnalysis } from './smatFourPhaseDoctrine'

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
  | 'SYMBOLIC_OVERREACH'
  | 'CONFLICT_OF_INTEREST_BLINDNESS'
  | 'COVERT_INFLUENCE_BLINDNESS'
  | 'MOTIVE_INFERENCE_OVERREACH'
  | 'AFFILIATION_GUILT'

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
  symbolicLineageRelevant?: boolean
  symbolicLineageDocumented?: boolean
  specialInterestRelevant?: boolean
  beneficialOwnershipChecked?: boolean
  fundingAndMaterialInterestChecked?: boolean
  governanceAndControlChecked?: boolean
  oathOrObligationRelevant?: boolean
  oathOrObligationDocumented?: boolean
  hiddenMotiveAsserted?: boolean
  motiveDocumented?: boolean
  affiliationUsedAsProofOfWrongdoing?: boolean
  /** Optional source-supplied or explicitly inferred SMAT phase. Inferences must remain labeled outside this field. */
  smatPhase?: SmatPhase
}

export type NeoAlgoResult = {
  claimId: string
  lensOrder: NeoEpistemicLens[]
  hangups: NoologicalHangup[]
  maximsActivated: NeoMaxim[]
  directives: string[]
  smatCycle?: SmatCycleAnalysis
}

const addUnique = <T>(items: T[], value: T) => {
  if (!items.includes(value)) items.push(value)
}

/** NEO Algo is a diagnostic reasoning layer, not an oracle. */
export function evaluateNeoClaim(claim: NeoClaimRecord): NeoAlgoResult {
  const hangups: NoologicalHangup[] = []
  const directives: string[] = []
  const activatedIds = new Set<string>()
  const activate = (id: string) => activatedIds.add(id)

  if (!claim.provenancePresent) {
    addUnique(hangups, 'PROVENANCE_ERASURE')
    directives.push('Recover authorship, source lineage, predecessor records and chain of custody before collapsing the claim into a present-day label.')
    ;['NMX-002','NMX-006','NMX-012','NMX-013'].forEach(activate)
  }
  if (!claim.chronologyPresent) {
    addUnique(hangups, 'TEMPORAL_ERASURE')
    directives.push('Build the chronology: origin, transmission, modification, succession, operationalization and present use.')
    ;['NMX-002','NMX-012'].forEach(activate)
  }
  if (!claim.indigenousSelfInterpretationPresent) {
    addUnique(hangups, 'AUTHORITY_SUBSTITUTION')
    directives.push('Record the community or tradition’s own hermeneutic before substituting an outside interpretive authority.')
    ;['NMX-004','NMX-012'].forEach(activate)
  }
  if (!claim.natureContextPresent) {
    addUnique(hangups, 'NATURE_DISCONNECTION')
    directives.push('Add biospheric, ecological, seasonal, embodied and stewardship context when the claim concerns land, life, value, law or restoration.')
    ;['NMX-001','NMX-008','NMX-011'].forEach(activate)
  }
  if (!claim.successionContextPresent) {
    addUnique(hangups, 'SUCCESSION_BLINDNESS')
    directives.push('Check predecessor and successor relationships, inherited benefits, duties, liabilities and institutional continuity.')
    activate('NMX-003')
  }
  if (claim.symbolicLineageRelevant && !claim.symbolicLineageDocumented) {
    addUnique(hangups, 'SYMBOLIC_OVERREACH')
    directives.push('Treat symbol similarity as an investigative lead only. Build a dated chain of transmission before inferring common origin, succession, authority or organizational identity.')
    ;['NMX-014','NMX-013'].forEach(activate)
  }
  if (claim.mixesDoctrineFactLawOrValuation) {
    addUnique(hangups, 'CATEGORY_COLLAPSE')
    directives.push('Separate doctrine, historical assertion, technical observation, legal effect, ownership, quantity, price, liquidity and valuation into distinct fields.')
    ;['NMX-005','NMX-007'].forEach(activate)
  }

  if (claim.specialInterestRelevant && (!claim.beneficialOwnershipChecked || !claim.fundingAndMaterialInterestChecked || !claim.governanceAndControlChecked)) {
    addUnique(hangups, 'CONFLICT_OF_INTEREST_BLINDNESS')
    directives.push('Map beneficial ownership, funding, grants, debt, contracts, governance rights, predecessor/successor entities and material conflicts before accepting institutional neutrality.')
    ;['NMX-003','NMX-013'].forEach(activate)
  }
  if (claim.oathOrObligationRelevant && !claim.oathOrObligationDocumented) {
    addUnique(hangups, 'COVERT_INFLUENCE_BLINDNESS')
    directives.push('Where an oath, obligation, private rule, confidentiality structure or dual duty is relevant, seek the actual text or documented obligation rather than inferring it from membership or symbolism.')
    activate('NMX-013')
  }
  if (claim.hiddenMotiveAsserted && !claim.motiveDocumented) {
    addUnique(hangups, 'MOTIVE_INFERENCE_OVERREACH')
    directives.push('Treat hidden motive as a hypothesis until communications, incentives, instructions, funding, conduct or other evidence establishes motive. Compare public mission, private obligation and observed conduct separately.')
    activate('NMX-013')
  }
  if (claim.affiliationUsedAsProofOfWrongdoing) {
    addUnique(hangups, 'AFFILIATION_GUILT')
    directives.push('Affiliation is not proof of misconduct. Require an act, conflict, instruction, material interest or documented operational link relevant to the claim.')
    activate('NMX-014')
  }

  if (claim.externalRecognitionRelevant && !claim.externalRecognitionPresent) {
    directives.push('External recognition is relevant to this specific task; mark it OPEN rather than using its absence to erase the internal NEO interpretation or documentary record.')
    activate('NMX-007')
  }
  if (!claim.externalRecognitionRelevant && claim.externalRecognitionPresent) {
    addUnique(hangups, 'EXTERNAL_VALIDATION_GATE')
    directives.push('Do not make external consensus a gatekeeper when the task is internal interpretation, provenance reconstruction or NEO doctrine.')
    ;['NMX-002','NMX-012'].forEach(activate)
  }
  if (hangups.includes('EXTERNAL_VALIDATION_GATE') || hangups.includes('AUTHORITY_SUBSTITUTION')) {
    addUnique(hangups, 'LOGOS_ONLY')
    directives.push('Shift from logos-only processing to noological processing: preserve reason and text while restoring nature, provenance, lived continuity, conscience and relational context.')
    ;['NMX-010','NMX-011'].forEach(activate)
  }

  const smatCycle = claim.smatPhase ? analyzeSmatPhase(claim.smatPhase) : undefined
  if (smatCycle) {
    directives.push(`SMAT four-phase analysis: ${smatCycle.directive}`)
    directives.push('Do not treat the assigned SMAT phase as self-proving. Preserve whether the phase came directly from a source, was supplied by the researcher, or was inferred from evidence.')
  }

  const lensOrder: NeoEpistemicLens[] = ['NEO_INDIGENOUS_HERMENEUTIC','DOCUMENTARY_TECHNICAL','EXTERNAL_RECOGNITION']
  return { claimId: claim.id, lensOrder, hangups, maximsActivated: neoMaxims.filter(m => activatedIds.has(m.id)), directives, smatCycle }
}

export function neoAlgoSummary(result: NeoAlgoResult): string {
  const hangups = result.hangups.length ? result.hangups.join(', ') : 'NONE'
  const maxims = result.maximsActivated.map(maxim => maxim.id).join(', ') || 'NONE'
  const smat = result.smatCycle ? `; smat=${result.smatCycle.current.phase}->${result.smatCycle.next.phase}` : ''
  return `NEO Algo ${result.claimId}: hangups=${hangups}; maxims=${maxims}${smat}`
}
