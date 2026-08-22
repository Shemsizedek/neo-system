export type SmatPhase = 'REVOLUTION' | 'ORIGINATION' | 'DORIGINATION' | 'EVOLUTION'
export type SmatSeason = 'SPRING' | 'SUMMER' | 'AUTUMN' | 'WINTER'

export type SmatPhaseRecord = {
  phase: SmatPhase
  order: 1 | 2 | 3 | 4
  season: SmatSeason
  quarter: 'BOTTOM_RIGHT' | 'TOP_RIGHT' | 'TOP_LEFT' | 'BOTTOM_LEFT'
  movement: 'COUNTERCLOCKWISE'
  doctrinalFunction: string
  neoOperationalReading: string
}

/**
 * Primary-source doctrinal model from Introduction to the Nature of Nature / Nature transcript.
 * This preserves the source terminology. It is a Noological doctrine object, not a claim that
 * modern physics or biology uses these four terms as its standard evolutionary taxonomy.
 */
export const smatFourPhases: readonly SmatPhaseRecord[] = [
  {
    phase: 'REVOLUTION',
    order: 1,
    season: 'SPRING',
    quarter: 'BOTTOM_RIGHT',
    movement: 'COUNTERCLOCKWISE',
    doctrinalFunction: 'Beginning, renewal and upward movement from Point 3 South within the SMAT Circle of Order.',
    neoOperationalReading: 'Identify emergence, reset, liberation, renewed standards and the first conditions of a new cycle.'
  },
  {
    phase: 'ORIGINATION',
    order: 2,
    season: 'SUMMER',
    quarter: 'TOP_RIGHT',
    movement: 'COUNTERCLOCKWISE',
    doctrinalFunction: 'Originary development, formation, maturation and high positive expression within the cycle.',
    neoOperationalReading: 'Identify formation, growth, organization, maturity, generative capacity and the consolidation of a new order.'
  },
  {
    phase: 'DORIGINATION',
    order: 3,
    season: 'AUTUMN',
    quarter: 'TOP_LEFT',
    movement: 'COUNTERCLOCKWISE',
    doctrinalFunction: 'The doriginary or autumnal phase: decline, reversal, release and transition away from originary fullness.',
    neoOperationalReading: 'Identify deterioration, extraction, fragmentation, reversal, loss of coherence and the conditions that produce decline.'
  },
  {
    phase: 'EVOLUTION',
    order: 4,
    season: 'WINTER',
    quarter: 'BOTTOM_LEFT',
    movement: 'COUNTERCLOCKWISE',
    doctrinalFunction: 'Evolutionary processing and completion of the lower half of the cycle before renewed Revolution.',
    neoOperationalReading: 'Identify terminal processing, adaptation, inherited residue, completion, lessons and conditions for return to renewal.'
  }
] as const

export const smatFourPhaseDoctrine = {
  id: 'NEO-SMAT-FOUR-PHASES',
  title: 'Four Evolutionary Phases of Nature — SMAT Circle of Order',
  domain: 'NOOLOGICAL_DOCTRINE',
  acronym: { SMAT: 'SPACE, MATTER, AND TIME' },
  movement: 'COUNTERCLOCKWISE',
  sequence: smatFourPhases.map((item) => item.phase),
  seasonalSequence: smatFourPhases.map((item) => item.season),
  sourceProvenance: [
    {
      work: 'Introduction to the Nature of Nature, Book One',
      locator: 'Part Two — The SMAT Circle of Order, p. 127',
      supports: 'SMAT = Space, Matter, and Time; Circle of Order framing.'
    },
    {
      work: 'Nature of Nature transcript',
      locator: 'Tape One, p. 18',
      supports: 'Four quarters: Revolution/Spring, Origination/Summer, Dorigination/Autumn, Evolution/Winter.'
    },
    {
      work: 'Introduction to the Nature of Nature, Book Two',
      locator: 'Prerequisite information, pp. 8–10',
      supports: 'Counterclockwise SMAT cycle and cycle-transition framing.'
    }
  ],
  preservationRules: [
    'Preserve the four source terms in this exact order: Revolution, Origination, Dorigination, Evolution.',
    'Do not silently substitute modern scientific terminology for the source doctrine.',
    'Keep source-derived doctrine separate from NEO operational interpretation.',
    'Treat the cycle as continuous: Evolution transitions back toward Revolution rather than ending the model.',
    'When a phase is inferred rather than explicitly supplied by a source, label the inference.'
  ],
  noologicalMaxim: 'A state is understood fully only when its place in the cycle, its origin, its transformation and its next condition are examined.'
} as const

export function getSmatPhase(phase: SmatPhase): SmatPhaseRecord {
  return smatFourPhases.find((item) => item.phase === phase)!
}

export function nextSmatPhase(phase: SmatPhase): SmatPhaseRecord {
  const current = getSmatPhase(phase)
  return smatFourPhases[current.order % smatFourPhases.length]
}

export type SmatCycleAnalysis = {
  current: SmatPhaseRecord
  next: SmatPhaseRecord
  questions: string[]
  directive: string
}

/** Operational NEO reasoning primitive: locate a subject within the fourfold cycle without pretending the phase was empirically proven. */
export function analyzeSmatPhase(phase: SmatPhase): SmatCycleAnalysis {
  const current = getSmatPhase(phase)
  const next = nextSmatPhase(phase)
  return {
    current,
    next,
    questions: [
      'What conditions define the present phase?',
      'What prior operation or cause produced this state?',
      'What relationships are sustaining or changing it?',
      `What evidence would show transition from ${current.phase} toward ${next.phase}?`,
      'What consequences follow if the present conditions continue?'
    ],
    directive: `${current.phase}: ${current.neoOperationalReading} Then test for evidence of transition toward ${next.phase}.`
  }
}
