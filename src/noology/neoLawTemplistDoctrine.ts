import { TEMPLIST_CURRICULUM_KNOWLEDGE } from './templistCurriculumKnowledge.js'

export const NEO_LAW_TEMPLIST_DOCTRINE = {
  id: 'NEO-LAW-TEMPLIST-001',
  classification: 'INTERNAL_ECCLESIASTICAL_EDUCATIONAL_DOCTRINE',
  purpose: 'Preserve the Temple Degree curriculum, obligations, offices, terminology, and internal norms as NEO Law source doctrine without overstating external legal effect.',
  internalControls: [
    'Major Lesson names and canonical study lists are protected source terms.',
    'Templist obligations may govern internal educational and ecclesiastical participation according to approved Temple rules.',
    'Profession obligations are curricular ethics and vocational commitments unless separately embodied in a legally enforceable instrument.',
    'Noonebu is a restricted sacred designation for the Elite and Elect; it is not a generic learner label.',
    'Exact Tests of Study supplied by the curriculum authority are immutable instructional records unless formally amended.',
  ] as const,
  externalBoundary: [
    'Internal NEO/Temple doctrine does not by itself establish civil jurisdiction, governmental authority, professional licensure, accreditation, or enforceable rights against third parties.',
    'Claims of legal recognition, historical status, accreditation, medical efficacy, scientific validation, or governmental authority require independent evidence and competent external authority.',
  ] as const,
  canon: TEMPLIST_CURRICULUM_KNOWLEDGE,
} as const
