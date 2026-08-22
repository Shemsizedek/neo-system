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

export type GisdLearningBand = "True Light Elementary" | "Nun Middle" | "Noone High" | "Nu University";

export function learningBandForDegree(degree: number): GisdLearningBand {
  if (!Number.isInteger(degree) || degree < 1 || degree > 144) throw new RangeError("degree must be an integer from 1 to 144");
  if (degree <= 5) return "True Light Elementary";
  if (degree <= 8) return "Nun Middle";
  if (degree <= 12) return "Noone High";
  return "Nu University";
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
  learnerTerm: "Templist",
  majorLessons: MAJOR_LESSONS,
  portfolioModel: true,
  assignments: ["essay", "article", "blog", "vlog", "research", "oral presentation", "practical demonstration", "service", "professional application"],
  tradeCareerIntegration: true,
  degree36RekaiThreshold: "Ra-Ka Nous Reiki™ (Rekai™) may be gifted at 36° of Major Lesson 1 according to the source-defined curriculum.",
  sourceBoundary: "Internal/source-supplied curriculum doctrine. External historical and scientific claims require separate verification.",
} as const;
