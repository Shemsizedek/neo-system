export type InfluenceEvidenceClass =
  | 'DIRECT_DOCUMENT'
  | 'DECLARED_MEMBERSHIP'
  | 'DECLARED_OATH_OR_OBLIGATION'
  | 'FINANCIAL_INTEREST'
  | 'GOVERNANCE_ROLE'
  | 'COMMUNICATION_OR_OPERATIONAL_RECORD'
  | 'SOURCE_ASSERTION'
  | 'SYMBOLIC_SIMILARITY'
  | 'INFERENCE'
  | 'UNKNOWN'

export type InfluenceSignalKind =
  | 'AFFILIATION'
  | 'OATH_OBLIGATION'
  | 'SECRECY'
  | 'FINANCIAL_INTEREST'
  | 'GOVERNANCE_CONTROL'
  | 'RECRUITMENT'
  | 'RITUAL_OR_PASSWORD'
  | 'SYMBOLIC_LANGUAGE'
  | 'POLITICAL_INFLUENCE'
  | 'MILITARY_INFLUENCE'
  | 'RELIGIOUS_INFLUENCE'
  | 'ECONOMIC_INFLUENCE'
  | 'INFORMATION_CONTROL'
  | 'CONFLICT_OF_INTEREST'

export type InfluenceSignal = {
  id: string
  kind: InfluenceSignalKind
  description: string
  evidenceClass: InfluenceEvidenceClass
  sourceRefs: string[]
  subjectIds?: string[]
  organizationIds?: string[]
  confidence?: number
  notes?: string[]
}

export type SpecialInterestProfile = {
  id: string
  name: string
  declaredMission?: string
  publicMission?: string
  observedOperations?: string[]
  statedRulesOrOaths?: string[]
  materialInterests?: string[]
  governanceLinks?: string[]
  affiliations?: string[]
  signals: InfluenceSignal[]
  sourceRefs: string[]
}

export type CounterInfluenceAssessment = {
  subjectId: string
  evidenceScore: number
  influenceRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'UNRESOLVED'
  documentedSignals: InfluenceSignal[]
  inferentialSignals: InfluenceSignal[]
  conflicts: string[]
  controls: string[]
}

const weight: Record<InfluenceEvidenceClass, number> = {
  DIRECT_DOCUMENT: 5,
  DECLARED_MEMBERSHIP: 5,
  DECLARED_OATH_OR_OBLIGATION: 5,
  FINANCIAL_INTEREST: 4,
  GOVERNANCE_ROLE: 4,
  COMMUNICATION_OR_OPERATIONAL_RECORD: 4,
  SOURCE_ASSERTION: 2,
  SYMBOLIC_SIMILARITY: 1,
  INFERENCE: 1,
  UNKNOWN: 0
}

export const secretSocietiesUnmaskedSourceRecords = [
  {
    id: 'SSU-PURPOSE',
    title: 'Source Purpose: Organizations, Orders, Clans and Cults',
    summary: 'The source states that its purpose is to expose what it characterizes as hidden structures, teachings, rituals and organizational relationships, and it defines secret, society, orders, clans and cults as distinct concepts.',
    sourceRefs: ['Secret Societies Unmasked — PDF pp.2-7'],
    tags: ['secrecy','organizations','orders','clans','cults','definitions','source-method']
  },
  {
    id: 'SSU-DEGREES-OATHS',
    title: 'Degrees, Oaths and Obligations',
    summary: 'The source reproduces degree structures, initiation descriptions, obligations and oath language as evidence of internal organizational commitments.',
    sourceRefs: ['Secret Societies Unmasked — PDF pp.14-25'],
    tags: ['degrees','oaths','obligations','initiation','internal-rules']
  },
  {
    id: 'SSU-SIGNS-CODES',
    title: 'Signs, Passwords, Grips and Symbolic Language',
    summary: 'The source treats signs, passwords, grips, dress, symbols and ritual language as organizational identifiers and communication systems.',
    sourceRefs: ['Secret Societies Unmasked — PDF pp.23-24, 52-54, 63-65'],
    tags: ['symbols','passwords','grips','dress','codes','semiotics']
  },
  {
    id: 'SSU-POLITICAL-INFLUENCE',
    title: 'Political and Institutional Influence Claims',
    summary: 'The source presents claims and examples about organizational membership, public officials, politics and institutional influence. These entries must remain source-qualified unless independently documented.',
    sourceRefs: ['Secret Societies Unmasked — PDF pp.14-15, 24-27'],
    tags: ['politics','membership','influence','institutions','source-claims']
  }
] as const

/**
 * Counter-influence assessment is an evidentiary protection layer, not a guilt-by-association engine.
 * It must never convert secret-society membership, symbolism, religion, ethnicity, race, or ideology
 * into automatic wrongdoing. Risk rises only with documented conflicts, material interests,
 * operational records, governance control, or explicit obligations relevant to the decision at hand.
 */
export function assessCounterInfluence(subjectId: string, signals: InfluenceSignal[]): CounterInfluenceAssessment {
  const documentedSignals = signals.filter(s => weight[s.evidenceClass] >= 4)
  const inferentialSignals = signals.filter(s => weight[s.evidenceClass] < 4)
  const evidenceScore = signals.reduce((total, signal) => total + weight[signal.evidenceClass] * Math.max(0.25, Math.min(1, signal.confidence ?? 1)), 0)
  const conflicts = signals.filter(s => s.kind === 'CONFLICT_OF_INTEREST' || s.kind === 'FINANCIAL_INTEREST' || s.kind === 'GOVERNANCE_CONTROL').map(s => s.description)

  let influenceRisk: CounterInfluenceAssessment['influenceRisk'] = 'UNRESOLVED'
  if (documentedSignals.length === 0 && inferentialSignals.length > 0) influenceRisk = 'UNRESOLVED'
  else if (evidenceScore >= 16 && conflicts.length > 0) influenceRisk = 'HIGH'
  else if (evidenceScore >= 8) influenceRisk = 'MODERATE'
  else if (documentedSignals.length > 0) influenceRisk = 'LOW'

  const controls = [
    'Separate public mission, declared obligations, material incentives and observed conduct into distinct fields.',
    'Require dated provenance for organizational membership, office, oath, funding, ownership or operational control.',
    'Do not infer motive from symbols, dress, religion, race, ethnicity, ideology or association alone.',
    'Map beneficial ownership, funding, governance rights, predecessor/successor entities and conflicts of interest where relevant.',
    'Compare stated mission against documented conduct without assuming hidden intent where the record is silent.',
    'Mark source allegations and interpretive claims as SOURCE_ASSERTION until corroborated by independent documentary evidence.',
    'Preserve contrary evidence and alternative explanations in the same influence graph.'
  ]

  return { subjectId, evidenceScore, influenceRisk, documentedSignals, inferentialSignals, conflicts, controls }
}

export const counterInfluenceMaxims = [
  'Interest is not guilt; undisclosed interest is a fact to investigate.',
  'A symbol is a lead, not a conviction.',
  'Follow authority, money, obligation, succession and documented conduct.',
  'Hidden motive is a hypothesis until evidence establishes motive.',
  'Protection requires transparency without reproducing secrecy through assumption.'
] as const
