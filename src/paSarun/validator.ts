import { LESSON_RULES, ROYAL_HOUSES } from "./registry";
import type { AuditFinding, PaSarunAuditResult, PaSarunCandidate } from "./types";

const GENERAL_TITLES = new Set(["Brother", "Sister", "Kin", "Kinfolk"]);
const NON_COUNCIL_ROYAL_TITLES = new Set(["Noble", "Prince", "Princess", "Lady", "Honorable", "Nin", "Nayya", "Kin", "H.E.", "H.E.M."]);

function finding(code: string, severity: AuditFinding["severity"], message: string): AuditFinding {
  return { code, severity, message };
}

function containsReservedSarun(value?: string): boolean {
  return Boolean(value && /\bsarun\b/i.test(value));
}

function containsStandaloneHotep(value?: string): boolean {
  if (!value) return false;
  return /(^|[\s-])hotep($|[\s-])/i.test(value) && !/im['’]?hotep/i.test(value);
}

function validateDegree(lesson: number, degree: number, findings: AuditFinding[]) {
  if (!Number.isInteger(degree) || degree < 1 || degree > 144) {
    findings.push(finding("DEGREE_RANGE", "error", "Degree must be an integer from 1 through 144."));
    return;
  }

  const expected = lesson === 1 ? [1, 36] : lesson === 2 ? [37, 72] : lesson === 3 ? [73, 108] : lesson === 4 ? [109, 144] : [144, 144];
  if (degree < expected[0] || degree > expected[1]) {
    findings.push(finding("LESSON_DEGREE_MISMATCH", "error", `Major Lesson ${lesson} expects degree ${expected[0]}-${expected[1]}${lesson >= 5 ? " honorary" : ""}.`));
  }
}

function renderName(candidate: PaSarunCandidate): string | undefined {
  const title = candidate.title?.trim();
  const suffix = candidate.suffix?.trim();
  const sa = candidate.personalName?.trim();
  const temple = candidate.templeName?.trim();
  const family = candidate.divineFamilyName?.trim();

  switch (candidate.majorLesson) {
    case 1:
      return [title, sa, suffix].filter(Boolean).join(" ");
    case 2:
    case 3:
    case 7:
    case 9:
      return [title, temple, family].filter(Boolean).join(" ");
    case 4:
    case 5:
    case 6:
    case 8:
      return [title, temple].filter(Boolean).join(" ");
  }
}

export function auditPaSarunName(candidate: PaSarunCandidate): PaSarunAuditResult {
  const findings: AuditFinding[] = [];
  const rule = LESSON_RULES[candidate.majorLesson];

  validateDegree(candidate.majorLesson, candidate.degree, findings);

  if (!candidate.personalName?.trim()) {
    findings.push(finding("PERSONAL_NAME_REQUIRED", "error", "A personal or Sa name is required for the audit record."));
  }

  if (candidate.degree <= 144 && candidate.majorLesson <= 4 && !candidate.professionOfObligation?.trim()) {
    findings.push(finding("PROFESSION_REQUIRED", "error", "A Profession of Obligation is required for counted degrees 1-144."));
  }

  if (candidate.title === "H.R.I." && !candidate.templeCouncilMember) {
    findings.push(finding("HRI_COUNCIL_ONLY", "error", "H.R.I. is reserved for Temple Council members."));
  }

  if (!candidate.templeCouncilMember && !GENERAL_TITLES.has(candidate.title) && !NON_COUNCIL_ROYAL_TITLES.has(candidate.title)) {
    findings.push(finding("TITLE_NOT_AUTHORIZED", "error", `Title ${candidate.title} is not authorized for this membership status.`));
  }

  if (candidate.neterName && !rule.neterAllowed) {
    findings.push(finding("NETER_LESSON_8_ONLY", "error", "Neter naming is restricted to Major Lesson 8 (Shamanism)."));
  }

  const searchableFields = [candidate.personalName, candidate.templeName, candidate.divineFamilyName, candidate.neterName, candidate.rulerLocationName, candidate.degreeName, candidate.ritualBlendName];
  if (searchableFields.some(containsReservedSarun)) {
    findings.push(finding("SARUN_RESERVED", "error", "Sarun is reserved terminology and may not be rendered as a personal name."));
  }

  if (searchableFields.some(containsStandaloneHotep)) {
    findings.push(finding("HOTEP_STANDALONE", "error", "Hotep may not be used as a standalone personal name; Im'hotep is the recognized complete example in this system."));
  }

  if (candidate.rulerLocationName && /nisut[-\s]?bit/i.test(candidate.rulerLocationName)) {
    findings.push(finding("NISUT_BIT_RENDERING", "error", "The location-based ruler name must not contain the words Nisut-Bit."));
  }

  if (candidate.majorLesson === 1 && !candidate.suffix) {
    findings.push(finding("SUFFIX_REQUIRED", "error", "Major Lesson 1 rendering requires the naturalization suffix."));
  }

  if ([2, 3, 7, 9].includes(candidate.majorLesson)) {
    if (!candidate.templeName?.trim()) findings.push(finding("TEMPLE_NAME_REQUIRED", "error", "This Major Lesson requires a Temple Name."));
    if (!candidate.divineFamilyName?.trim()) findings.push(finding("DIVINE_FAMILY_REQUIRED", "error", "This Major Lesson requires a Divine Family Name."));
  }

  if ([4, 5, 6, 8].includes(candidate.majorLesson) && !candidate.templeName?.trim()) {
    findings.push(finding("TEMPLE_NAME_REQUIRED", "error", "This Major Lesson requires a Temple Name."));
  }

  if (candidate.royalHouse) {
    const house = ROYAL_HOUSES[candidate.royalHouse as keyof typeof ROYAL_HOUSES];
    if (!house) {
      findings.push(finding("ROYAL_HOUSE_UNKNOWN", "error", "Royal House is not recognized by the Pa Sarun registry."));
    } else if (candidate.divineFamilyName && [7, 9].includes(candidate.majorLesson) && candidate.divineFamilyName !== house.familyName) {
      findings.push(finding("ROYAL_HOUSE_FAMILY_MISMATCH", "warning", `Selected Royal House normally maps to family name ${house.familyName}.`));
    }
  }

  if (!rule.mixingAllowed && candidate.ritualBlendName) {
    findings.push(finding("LANGUAGE_MIXING_REVIEW", "warning", "Cross-language blending is not authorized for this Major Lesson except where a specifically approved ritual blend applies."));
  }

  const valid = findings.every((item) => item.severity !== "error");
  return {
    valid,
    majorLesson: candidate.majorLesson,
    chamber: rule.chamber,
    language: rule.language,
    house: rule.house,
    namingFormula: rule.namingFormula,
    renderedName: valid ? renderName(candidate) : undefined,
    findings,
  };
}
