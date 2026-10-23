export type SacredChamberId = "wife" | "concubine" | "holy-mother" | "daughter";

export type SacredChamberRecord = {
  id: SacredChamberId;
  name: string;
  order: "Solar" | "Lunar" | "Earth" | "Stellar";
  alchemicalPhase: "Rubedo" | "Nigredo" | "Citrinitas" | "Albedo";
  purpose: string;
  adultIntimate: boolean;
  governance: string[];
  safeguards: string[];
};

export const SACRED_CHAMBERS_SOURCE = "docs/doctrine/sacred-chambers/README.md";

export const SACRED_CHAMBERS: Record<SacredChamberId, SacredChamberRecord> = {
  wife: {
    id: "wife",
    name: "Wife Chamber",
    order: "Solar",
    alchemicalPhase: "Rubedo",
    purpose: "Senior adult family governance, household administration, mentorship, and estate stewardship where separately authorized.",
    adultIntimate: true,
    governance: ["Holy Mother oversight", "private covenant", "9th Major Lesson"],
    safeguards: ["adult-only", "affirmative and revocable consent", "no coercion", "civil-rights boundary"],
  },
  concubine: {
    id: "concubine",
    name: "Concubine Chamber",
    order: "Lunar",
    alchemicalPhase: "Nigredo",
    purpose: "Private adult covenantal chamber for companionship, education, service or employment where separately contracted, and possible progression toward Wife review.",
    adultIntimate: true,
    governance: ["Wife Chamber oversight", "private covenant", "9th Major Lesson"],
    safeguards: ["adult-only", "affirmative and revocable consent", "sexual activity is never an employment duty", "protected exit path"],
  },
  "holy-mother": {
    id: "holy-mother",
    name: "Holy Mother Chamber",
    order: "Earth",
    alchemicalPhase: "Citrinitas",
    purpose: "Senior safeguarding, lineage, education, welfare, and continuity office within the Sacred Chambers.",
    adultIntimate: false,
    governance: ["safeguarding authority", "lineage stewardship", "education oversight"],
    safeguards: ["anti-retaliation", "conflict-of-interest review", "consent cannot be overridden", "independent grievance path"],
  },
  daughter: {
    id: "daughter",
    name: "Daughter Chamber",
    order: "Stellar",
    alchemicalPhase: "Albedo",
    purpose: "Lineage, education, and succession category only.",
    adultIntimate: false,
    governance: ["education", "succession", "lineage continuity"],
    safeguards: ["never an intimate or sexual chamber", "minors excluded from adult rites and agreements", "age-appropriate curriculum only"],
  },
};

export const SACRED_CHAMBERS_POLICY = {
  doctrineId: "doctrine.family_order.sacred_chambers",
  ninthMajorLesson: true,
  templePledgeSystem: true,
  oracleRule: "Distinguish doctrine and internal policy from public law, historical claims, scientific claims, and independently verified facts.",
  algoRule: "Never infer consent from status, prior consent, tokens, pledges, marriage, or chamber membership.",
  lawRule: "Private covenants require jurisdiction-specific review before being represented as legally enforceable.",
  identityRule: "Chamber credentials are private, least-privilege, and must not publish intimate status by default.",
} as const;

export function sacredChamberById(id: SacredChamberId): SacredChamberRecord {
  return SACRED_CHAMBERS[id];
}

export function mayEnterAdultIntimateChamber(age: number, consent: boolean, chamber: SacredChamberId): boolean {
  return age >= 18 && consent === true && SACRED_CHAMBERS[chamber].adultIntimate === true;
}
