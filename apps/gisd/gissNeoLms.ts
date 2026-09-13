import { GISD_TEMPLIST_CURRICULUM, buildGisdDegreeRecord } from './curriculum.js'

export const GISS_NEO_LMS_TEMPLIST = {
  id: 'GISS-NEO-LMS-TEMPLIST-001',
  title: 'GISS NEO LMS — Templist 144 Degree Curriculum',
  curriculumId: GISD_TEMPLIST_CURRICULUM.id,
  learnerTerm: 'Templist',
  deliveryModel: 'lifelong portfolio-based learning',
  requiredDegreeRecordFields: [
    'Major Lesson', 'Element', 'Temple Lodge', 'Greeting', 'Religious Order', 'Divine House', 'Deity', 'Family', 'Theme',
    'Degree Introduction', 'Metal', 'Star Constellation', 'Grip', 'Password', 'Token', 'Virtue', 'Morale', 'Principle',
    'Meaning of Degree', 'Templist Interview Questions', 'Lesson Overview', 'Study of Degree', 'Test of Study', 'Sacred Art',
    'Academia', 'Assignment', 'Symbolism', 'Labor/Career Knowledge', 'Obligation of Profession', 'Conclusion',
  ] as const,
  assessmentEvidence: [
    'written work', 'oral presentation', 'blog/vlog/podcast', 'research', 'practical demonstration', 'service', 'field work', 'artifact', 'professional application', 'Test of Study',
  ] as const,
  portfolioRule: 'Preserve all completed degree evidence as a cumulative learner portfolio; corrections and revisions remain versioned rather than silently overwriting prior work.',
  professionRule: 'Every degree connects learning to trade/career knowledge and an Obligation of Profession.',
  neologyRule: 'Language assignments may use Neology when the Templist explains the grammatical, etymological, morphological, or dialectical basis of the new term.',
  sourceBoundary: GISD_TEMPLIST_CURRICULUM.sourceBoundary,
} as const

export function buildGissNeoLmsDegree(degree: number) {
  return {
    ...buildGisdDegreeRecord(degree),
    lms: GISS_NEO_LMS_TEMPLIST,
  }
}
