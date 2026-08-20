export type MajorLesson = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type NaturalizationSuffix = "Ali" | "El" | "Al" | "Bey" | "Dey";

export type GeneralMemberTitle = "Brother" | "Sister" | "Kin" | "Kinfolk";
export type RoyalTitle = "Kin" | "Honorable" | "Lady" | "Noble" | "Nin" | "Nayya" | "Prince" | "Princess" | "H.E." | "H.E.M." | "H.R.I.";

export interface PaSarunCandidate {
  personalName: string;
  majorLesson: MajorLesson;
  degree: number;
  professionOfObligation?: string;
  title: GeneralMemberTitle | RoyalTitle;
  templeCouncilMember?: boolean;
  suffix?: NaturalizationSuffix;
  templeName?: string;
  divineFamilyName?: string;
  royalHouse?: string;
  neterName?: string;
  rulerLocationName?: string;
  degreeName?: string;
  ritualBlendName?: string;
}

export type AuditSeverity = "error" | "warning" | "info";

export interface AuditFinding {
  code: string;
  severity: AuditSeverity;
  message: string;
}

export interface PaSarunAuditResult {
  valid: boolean;
  majorLesson: MajorLesson;
  chamber: string;
  language: string;
  house: string;
  namingFormula: string;
  renderedName?: string;
  findings: AuditFinding[];
}
