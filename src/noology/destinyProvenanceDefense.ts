export type DestinyDisplacementEventKind =
  | 'ORIGIN_SUPPRESSION'
  | 'AUTHORSHIP_ERASURE'
  | 'DOCTRINE_RENAMING'
  | 'SYMBOL_APPROPRIATION'
  | 'RITUAL_APPROPRIATION'
  | 'INSTITUTIONAL_CAPTURE'
  | 'TITLE_OR_OFFICE_SUBSTITUTION'
  | 'ECONOMIC_EXTRACTION'
  | 'SUCCESSION_REASSIGNMENT'
  | 'NARRATIVE_REPLACEMENT'
  | 'ACCESS_RESTRICTION'
  | 'RECORD_DESTRUCTION_OR_WITHHOLDING'

export type DestinyEvidenceStatus =
  | 'DIRECT_DOCUMENT'
  | 'SOURCE_ASSERTED'
  | 'CORROBORATED'
  | 'INFERRED'
  | 'OPEN'

export type DestinyDisplacementEvent = {
  id: string
  kind: DestinyDisplacementEventKind
  originalStewardOrSource: string
  displacedObject: string
  successorOrAdoptingEntity?: string
  mechanism: string
  dateOrPeriod?: string
  sourceRefs: string[]
  evidenceStatus: DestinyEvidenceStatus
  benefitsOrEffects?: string[]
  unresolvedQuestions?: string[]
}

export type DestinyProtectionAssessment = {
  subjectId: string
  displacementRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'UNRESOLVED'
  documentedEvents: DestinyDisplacementEvent[]
  openEvents: DestinyDisplacementEvent[]
  requiredControls: string[]
}

const strongEvidence = new Set<DestinyEvidenceStatus>(['DIRECT_DOCUMENT', 'CORROBORATED'])

/**
 * "Destiny swapping" is modeled here as provenance displacement: the loss,
 * reassignment, renaming, capture, or monetization of another community's
 * authorship, doctrine, symbols, offices, records, cultural property, or
 * institutional continuity.
 *
 * The engine does not infer a coordinated conspiracy merely from similarity.
 * It requires source-linked events, dated transmission, benefit/control records,
 * or other documentary evidence before elevating a relationship.
 */
export function assessDestinyProtection(subjectId: string, events: DestinyDisplacementEvent[]): DestinyProtectionAssessment {
  const documentedEvents = events.filter(event => strongEvidence.has(event.evidenceStatus))
  const openEvents = events.filter(event => !strongEvidence.has(event.evidenceStatus))
  const severeKinds = new Set<DestinyDisplacementEventKind>([
    'ORIGIN_SUPPRESSION',
    'AUTHORSHIP_ERASURE',
    'INSTITUTIONAL_CAPTURE',
    'SUCCESSION_REASSIGNMENT',
    'RECORD_DESTRUCTION_OR_WITHHOLDING'
  ])
  const severeDocumented = documentedEvents.filter(event => severeKinds.has(event.kind)).length

  let displacementRisk: DestinyProtectionAssessment['displacementRisk'] = 'UNRESOLVED'
  if (!events.length) displacementRisk = 'LOW'
  else if (severeDocumented >= 2 || documentedEvents.length >= 4) displacementRisk = 'HIGH'
  else if (documentedEvents.length >= 1) displacementRisk = 'MODERATE'

  return {
    subjectId,
    displacementRisk,
    documentedEvents,
    openEvents,
    requiredControls: [
      'Preserve original names, titles, language, dates, symbols, offices and source citations before normalization.',
      'Separate resemblance from transmission: require a dated chain before claiming appropriation or succession.',
      'Track who originated, copied, renamed, published, patented, licensed, monetized, governed or inherited the object.',
      'Attach predecessor/successor and beneficial-interest records to every institutional continuity claim.',
      'Record the originating community’s self-interpretation before later institutional reinterpretations.',
      'Never let popularity, state recognition, market dominance or later publication overwrite first provenance.',
      'Preserve contrary evidence, competing lineage claims and unresolved gaps in the same graph.',
      'Link proven displacement to title, restitution, royalty, provenance-correction or restorative-accounting workflows.'
    ]
  }
}

export const destinyProtectionDoctrine = [
  {
    id: 'DPD-001',
    title: 'Original Provenance Before Successor Prestige',
    teaching: 'Later institutional prestige does not replace the duty to identify the earliest supported source, steward, author, doctrine or record.',
    sourceRefs: ['Secret Societies Unmasked — introduction and organizational-definition sections, PDF pp.8-11'],
    provenance: 'NEO_SYNTHESIS'
  },
  {
    id: 'DPD-002',
    title: 'Obligation Structures Matter',
    teaching: 'Private oaths, rules, passwords, obligations and internal governance are relevant when they materially affect conduct, control, loyalty or conflicts of interest.',
    sourceRefs: ['Secret Societies Unmasked — Freemasonry oath and degree sections, PDF pp.17-27; Klan oath, pp.29-31; fraternal oath examples, pp.43-58'],
    provenance: 'SOURCE_DERIVED'
  },
  {
    id: 'DPD-003',
    title: 'Symbol Transmission Requires Chain of Custody',
    teaching: 'Shared symbols may indicate transmission, imitation, convergence or coincidence; the Algo must seek dated provenance before assigning origin or organizational identity.',
    sourceRefs: ['Secret Societies Unmasked — symbol comparison sections, PDF pp.32-38, 50-52, 79-87'],
    provenance: 'NEO_SYNTHESIS'
  },
  {
    id: 'DPD-004',
    title: 'Source-Defined Luciferian Conspiracy Frame',
    teaching: 'The source interprets multiple secret-society, occult, religious and symbolic systems through a conflict between divine order and a Luciferian/Satanic counter-order. NEO Algo stores this as the source’s interpretive doctrine, not as automatic proof about every named institution or person.',
    sourceRefs: ['Secret Societies Unmasked — introduction, PDF pp.8-11; occultism/commentary, PDF pp.80-87'],
    provenance: 'SOURCE_ASSERTED'
  },
  {
    id: 'DPD-005',
    title: 'Protection Against Destiny Displacement',
    teaching: 'When authorship, doctrine, title, symbols, sacred records or economic benefits move away from the originating people, preserve the complete transmission and benefit chain so restoration can be evaluated.',
    sourceRefs: ['NEO synthesis across Sacred Records, title/inheritance schema, counter-influence intelligence and Secret Societies Unmasked'],
    provenance: 'NEO_SYNTHESIS'
  }
] as const

export const destinyProtectionMaxims = [
  'Origin cannot be replaced by repetition.',
  'A renamed inheritance still requires a title search.',
  'Prestige is not provenance.',
  'Similarity opens an inquiry; transmission proves a lineage.',
  'Preserve the first record before evaluating the later claim.',
  'No restoration without provenance; no provenance without records.'
] as const
