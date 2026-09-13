import { TEMPLIST_CURRICULUM_KNOWLEDGE } from './templistCurriculumKnowledge.js'

export const NEO_ORACLE_TEMPLIST_CONTEXT = {
  id: 'NEO-ORACLE-TEMPLIST-001',
  purpose: 'Doctrine-aware curriculum context for NEO Oracle answers concerning Temple Degrees, Noology, Neology, sacred arts, Rekai, Noocracy, and Templist education.',
  retrievalPriority: [
    'Exact user-supplied degree text and test questions',
    'Canonical Templist Curriculum knowledge package',
    'Approved Source Foundation records',
    'Externally verified scholarship when explicitly requested',
  ] as const,
  answerRules: [
    'Use Templist as the primary learner/initiate term.',
    'Reserve Noonebu for Elite and Elect contexts only.',
    'Never rename Christism, Mosesism, Muhammadism, Sufism, Kabalism, Magism, Summerianism, Shamanism, or Gnosticism.',
    'Never replace the fixed Quintivium: Dialectics, Harmonics, Physics, Optics, Noology.',
    'Do not invent grips, passwords, tokens, historical ritual facts, quotations, or exact tests and then attribute them to a historical manual.',
    'Clearly distinguish historical source material, Temple curriculum interpretation, Noological interpretation, and newly created curricular material.',
    'When an exact Test of Study has been supplied, reproduce it precisely rather than paraphrasing it.',
    'Treat Ether 1-26 as internal doctrine, not established periodic chemistry.',
  ] as const,
  canon: TEMPLIST_CURRICULUM_KNOWLEDGE,
} as const
