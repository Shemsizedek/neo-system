import { GISD_TEMPLIST_CURRICULUM } from '../../apps/gisd/curriculum.js'
import { CURRICULUM_GUARDRAILS, QUINTIVIUM, TRIVIUM, QUADRIVIUM } from '../../core/neo-algo/templistCurriculum.js'

export const TEMPLIST_CURRICULUM_KNOWLEDGE = {
  id: 'NEO-TEMPLIST-CURRICULUM-CANON-001',
  title: 'Templist Curriculum — 144 Degree Canon',
  status: 'SOURCE_SUPPLIED_INTERNAL_DOCTRINE',
  scope: [
    'NEO Algo',
    'NEO Oracle',
    'GISD / GISS NEO LMS',
    'NEOsync Digital Etheric Intelligence',
    'NEO Law internal doctrine classification',
    'NEO Society internal social norms',
    'LUMEN education intelligence',
    'SCROLL archival preservation',
    'NEO Library / Neopedia indexing',
  ] as const,
  degreeArchitecture: {
    totalDegrees: 144,
    majorLessons1to4: '36 degrees each: 1-36, 37-72, 73-108, 109-144',
    themes: {
      '1-36': 'Masonic',
      '37-72': 'Magi',
      '73-108': 'Shriner',
      '109-144': 'Mystic',
      '144': 'Elite / Elect; encompasses Major Lessons 5-9 as honorary study',
    },
    elementRule: 'Degrees 1-118 correspond 1:1 with atomic numbers 1-118. Degrees 119-144 are Ether 1-26 in the internal doctrine and are not established periodic elements.',
  },
  languageDoctrine: {
    primaryLearnerTerm: 'Templist',
    restrictedEliteTerm: 'Noonebu',
    noonebuScope: 'Sacred term for the Elite and Elect of the Noocratic Society and the Moorish Divine and National Movement through Branch Temple No. #24.',
    neology: 'Noologists and neophytes may create new words and alchemical linguistic formulas by applying the law, grammar, etymology, and dialectics of the particular language. Coinages must be reasoned, not arbitrary.',
  },
  sacredArts: {
    trivium: TRIVIUM,
    quadrivium: QUADRIVIUM,
    quintivium: QUINTIVIUM,
    quintiviumAttribution: 'Dr. Lawiy Zodok Shamu-El',
    quintiviumRule: 'The Quintivium is fixed: Dialectics, Harmonics, Physics, Optics, Noology. Noology is the last and sacred art. Do not rename, expand, reduce, or substitute this list.',
  },
  requiredCrossReferences: [
    'The Neoteric Method by Dr. Lawiy Zodok',
    'The Noocracy Papers',
    'Ra-Ka Nous Reiki™ / Rekai™',
    'Noology',
    'Neology',
  ] as const,
  rekai: {
    definition: 'Ra-Ka Nous Reiki™ / Rekai™ is stored as a Noological, Hika-based spiritual-therapy curriculum centered on Nous Field Being and cultivation; symbols support advanced practice rather than replace the state of being.',
    threshold: 'Rekai™ is gifted at 36° of Major Lesson 1 according to the source-defined curriculum.',
    medicalBoundary: 'Spiritual/wellness curriculum; not a medical credential and not a substitute for licensed care.',
  },
  curriculum: GISD_TEMPLIST_CURRICULUM,
  masterTemplatePolicy: {
    preserveExactStructure: true,
    preserveMajorLessonNames: true,
    preserveStudyLists: true,
    preserveExactTestQuestionsWhenSupplied: true,
    doNotInventMissingRitualFacts: true,
    sourceHistoricalTempleDistinctionRequired: true,
  },
  governance: {
    internalDoctrineOnly: true,
    externalAuthorityBoundary: 'Temple curriculum, sacred offices, internal NEO Law, and social norms do not automatically create civil jurisdiction, accreditation, professional licensure, or externally enforceable legal authority.',
    evidenceRule: 'Historical, scientific, medical, legal, accreditation, and external recognition claims require separate verification and provenance.',
  },
  guardrails: CURRICULUM_GUARDRAILS,
} as const

export type TemplistCurriculumKnowledge = typeof TEMPLIST_CURRICULUM_KNOWLEDGE
