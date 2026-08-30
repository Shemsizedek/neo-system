import {
  CURRICULUM_GUARDRAILS,
  MAJOR_LESSONS,
  MASTER_TEMPLATE_FIELDS,
  QUADRIVIUM,
  QUINTIVIUM,
  TRIVIUM,
  curriculumThemeForDegree,
  elementForDegree,
} from "../../core/neo-algo/templistCurriculum.js";

export type GisdLearningBand =
  | "True Light Elementary"
  | "Nun Middle"
  | "Noone High"
  | "Nu University"
  | "Nu Omni Academy / Amen Institute";

export function learningBandForDegree(degree: number): GisdLearningBand {
  if (!Number.isInteger(degree) || degree < 1 || degree > 144) throw new RangeError("degree must be an integer from 1 to 144");
  if (degree <= 5) return "True Light Elementary";
  if (degree <= 8) return "Nun Middle";
  if (degree <= 12) return "Noone High";
  if (degree <= 21) return "Nu University";
  return "Nu Omni Academy / Amen Institute";
}

export type GisdAssignmentMode =
  | "essay"
  | "report"
  | "excerpt"
  | "research paper"
  | "journal"
  | "blog"
  | "vlog"
  | "podcast"
  | "oral presentation"
  | "practical demonstration"
  | "service"
  | "field assignment"
  | "object / artifact"
  | "professional application";

export function mobilityProfile(age: number) {
  if (age <= 13) {
    return {
      mode: "home-or-local",
      description: "Assignments may be completed at home, in a school building, temple district, or shared living/learning quarters with age-appropriate complexity.",
    } as const;
  }
  return {
    mode: "mobile-field-capable",
    description: "Learners age 14+ may complete location-based research, service, travel, documentation, interviews, and content-curation assignments when appropriate.",
  } as const;
}

export function buildGisdDegreeRecord(degree: number) {
  return {
    degree,
    learningBand: learningBandForDegree(degree),
    theme: curriculumThemeForDegree(degree),
    element: elementForDegree(degree),
    templateFields: MASTER_TEMPLATE_FIELDS,
    academicArts: { trivium: TRIVIUM, quadrivium: QUADRIVIUM, quintivium: QUINTIVIUM },
    guardrails: CURRICULUM_GUARDRAILS,
  };
}

export const GISD_TEMPLIST_CURRICULUM = {
  id: "GISD-TEMPLIST-144",
  name: "GISD Templist Curriculum — 144 Degrees",
  totalDegrees: 144,
  universalEntryRule: "Every initiate begins at Temple Degree 1 regardless of age or prior schooling. Complexity and sophistication of assignments are adapted to age and readiness, not the degree sequence itself.",
  learnerTerm: "Templist",
  majorLessons: MAJOR_LESSONS,
  schoolBands: {
    elementary: "Degrees 1-5 — True Light Elementary",
    middle: "Degrees 6-8 — Nun Middle",
    high: "Degrees 9-12 — Noone High",
    university: "Degrees 13-21 — Nu University; doctrine contribution, research, and teacher-development pathway",
    honoraryVocational: "Degree 9+ eligibility — Nu Omni Academy and Amen Institute for honorary, vocational, trade, scientific, and professional study",
    advanced: "Degrees 22-144 — advanced vocational, scientific, doctrinal, leadership, elderhood, and global service portfolio",
  },
  initiationStoneRequired: true,
  initiationStoneRule: "Each initiate brings a stone or crystal as part of initiation; milestone stone practices may be locally adopted and recorded in the learner portfolio.",
  portfolioModel: true,
  assignments: [
    "essay", "report", "excerpt", "research paper", "journal", "blog", "vlog", "podcast", "oral presentation",
    "practical demonstration", "service", "field assignment", "object / artifact", "professional application",
  ] as GisdAssignmentMode[],
  multiAssignmentDegrees: true,
  portfolioPurpose: "Each degree may contain multiple assignments, tasks, objects, goals, interviews, tests, service obligations, and professional obligations. Completed work accumulates into a lifelong Global Village portfolio.",
  ageAdaptation: {
    under14: "Home, temple school, local school, shared quarters, or supervised local environments; reduced sophistication where appropriate.",
    age14plus: "May include mobile/location-based field work, travel, interviews, documentation, service, and content curation.",
  },
  tradeCareerIntegration: true,
  fundingModel: "Temple Pledge System plus other approved Nous Project / GISS global endeavors.",
  degree36RekaiThreshold: "Ra-Ka Nous Reiki™ (Rekai™) may be gifted at 36° of Major Lesson 1 according to the source-defined curriculum.",
  sourceBoundary: "Internal/source-supplied curriculum doctrine. External historical, scientific, medical, legal, and accreditation claims require separate verification.",
} as const;
