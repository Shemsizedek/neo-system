import { neoDoctrineRegistry } from './doctrineRegistry'
import { smatFourPhaseDoctrine, smatFourPhases } from './smatFourPhaseDoctrine'

/**
 * Canonical NEO master doctrine anchors.
 * Source-derived doctrine and NEO synthesis stay explicitly separated.
 */
export const masterNoologicalDoctrine = {
  id: 'NEO-MASTER-NOOLOGICAL-DOCTRINE',
  title: 'Master Noological Doctrine',
  epistemicSequence: ['RIGHT_KNOWLEDGE','RIGHT_WISDOM','RIGHT_OVERSTANDING','RIGHT_ACTION'] as const,
  fourDimensions: [
    { name: 'LENGTH', noologicalReading: 'EXTENSION' },
    { name: 'WIDTH', noologicalReading: 'RELATION_AND_RANGE' },
    { name: 'HEIGHT', noologicalReading: 'DEGREE_AND_ELEVATION' },
    { name: 'DEPTH', noologicalReading: 'INNER_RELATION_ORIGIN_OPERATION_CAUSE_AND_MEANING' }
  ] as const,
  factologyAnchors: [
    'THE_RESULT_DOES_NOT_REVEAL_THE_OPERATION',
    'SAME_RESULT_DOES_NOT_ESTABLISH_SAME_PROCESS',
    'ONE_FACE_IS_NOT_THE_WHOLE_STRUCTURE',
    'SOURCE_PROVENANCE_PRECEDES_SYNTHESIS'
  ] as const,
  smat: {
    acronym: 'SPACE, MATTER, AND TIME',
    movement: 'COUNTERCLOCKWISE',
    phases: smatFourPhases,
    canonicalSequence: ['REVOLUTION','ORIGINATION','DORIGINATION','EVOLUTION'] as const,
    cycleRule: 'EVOLUTION_RETURNS_TOWARD_REVOLUTION'
  },
  sourceDoctrine: smatFourPhaseDoctrine,
  registeredDoctrine: neoDoctrineRegistry,
  preservationPolicy: {
    appendOnlyConceptHistory: true,
    preserveSourceTerminology: true,
    preserveContradictions: true,
    preserveVariants: true,
    separateSourceFromSynthesis: true,
    requireProvenanceForPromotion: true
  },
  governingMaxims: [
    'Right Knowledge must be organized in sequence.',
    'The result does not reveal the operation.',
    'Never mistake one face for the whole structure.',
    'A state is understood fully only when its place in the cycle, its origin, its transformation and its next condition are examined.'
  ] as const
} as const
