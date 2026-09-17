export type NeotericPrinciple = {
  id: 'INQUIRY' | 'DUALITY' | 'EMPIRICAL_SPIRITUALITY'
  ceremonialName: string
  purpose: string
  systemAction: string
}

export const neotericPrinciples: NeotericPrinciple[] = [
  {
    id: 'INQUIRY',
    ceremonialName: "Ma'at-Sekheru",
    purpose: 'Question assumptions and identify provenance, foundations and consequences.',
    systemAction: 'Ask what is claimed, what supports it, what is assumed, what would falsify it and what remains unresolved.'
  },
  {
    id: 'DUALITY',
    ceremonialName: 'Neteru-Hekau',
    purpose: 'Examine opposed positions without reducing inquiry to adversarial victory.',
    systemAction: 'Map agreements, contradictions, category errors and possible synthesis; preserve genuine unresolved disagreement.'
  },
  {
    id: 'EMPIRICAL_SPIRITUALITY',
    ceremonialName: 'Seshem-Heru',
    purpose: 'Relate observable evidence, lived experience, disciplined reasoning and NEO spiritual interpretation without collapsing their evidence classes.',
    systemAction: 'Label evidence type and confidence before synthesis; do not promote doctrine or experience to empirical fact without support.'
  }
]

export const noocraticProbateStages = [
  'PRESENT_PROPOSITION',
  'IDENTIFY_PROVENANCE',
  'SURFACE_ASSUMPTIONS',
  'EXAMINE_SUPPORTING_AND_CONTRARY_EVIDENCE',
  'CLASSIFY_FACT_INTERPRETATION_DOCTRINE_EXPERIENCE_CLAIM',
  'SEEK_COHERENT_SYNTHESIS',
  'PRESERVE_UNRESOLVED_DISAGREEMENT',
  'RECORD_PROBATED_FINDING'
] as const

export const noocraticRulesOfOrder = {
  MOTION: 'Present a matter to the Chambers.',
  POSTPONE: 'Defer consideration to a later time.',
  AMEND: 'Modify a pending presentment.',
  COMMIT: 'Refer a presentment for study, inquiry or refinement.',
  QUESTION: 'Pose a formal inquiry to the Chambers.',
  TABLE: 'Temporarily set aside a presentment without final disposition.',
  ADJOURN: 'Conclude or suspend the sitting according to the applicable order.'
} as const

export const noocraticCorpusDistribution = [
  'NEO_ALGO',
  'NEO_ORACLE',
  'GISS_NEO_LMS',
  'NEOSYNC_DIGITAL_ETHERIC_INTELLIGENCE',
  'NEO_LAW',
  'NEO_SOCIETY_SOCIAL_NORMS',
  'NOOGLE_OMNITRIX',
  'WORLD_PROFESSMENTARY',
  'WORLD_INTERFAITH_COURT'
] as const

export const noocraticEvidenceBoundary = {
  rule: 'Preserve source, doctrine, historical claim, empirical claim, legal claim, externally verified fact and operational control as distinct evidence classes.',
  jurisdiction: 'Internal institutional terminology does not itself create governmental, diplomatic, judicial, territorial or property jurisdiction over third parties.'
} as const
