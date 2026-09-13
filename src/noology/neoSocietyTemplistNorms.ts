import { TEMPLIST_CURRICULUM_KNOWLEDGE } from './templistCurriculumKnowledge.js'

export const NEO_SOCIETY_TEMPLIST_NORMS = {
  id: 'NEO-SOCIETY-TEMPLIST-NORMS-001',
  scope: 'Internal NEO Society / Temple educational and social norms',
  norms: [
    'Use Templist as the ordinary term for the curriculum learner/initiate.',
    'Reserve Noonebu for the Elite and Elect contexts defined by the Noocratic Society and Branch Temple No. #24.',
    'Respect the fixed names of the nine Major Lessons and do not casually rename sacred curriculum terms.',
    'Neology is disciplined word-creation: new words should follow the grammar, etymology, morphology, and dialectical law of the language being used.',
    'Study precedes title. Advancement should reflect demonstrated knowledge, assignments, tests, service, and professional obligation rather than title accumulation alone.',
    'Each degree connects sacred study to useful labor, trade, profession, ethics, and service.',
    'Source doctrine, historical scholarship, personal interpretation, and external verification should be labeled distinctly.',
    'Sacred or restricted material should not be exposed publicly merely because it exists in the internal curriculum.',
    'Correction is additive and provenance-preserving: earlier records are not silently rewritten when doctrine is clarified.',
    'The Templist curriculum is lifelong; educational advancement should cultivate reasoning, craftsmanship, service, and Noological development.',
  ] as const,
  canon: TEMPLIST_CURRICULUM_KNOWLEDGE,
} as const
