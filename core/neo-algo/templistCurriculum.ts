export type CurriculumTheme = "Masonic" | "Magi" | "Shriner" | "Mystic" | "Elite";

export type MajorLesson = {
  number: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  name: "Christism" | "Mosesism" | "Muhammadism" | "Sufism" | "Kabalism" | "Magism" | "Summerianism" | "Shamanism" | "Gnosticism";
  religiousOrder: string;
  lodge: string;
  divineHouse: string;
  deity: string;
  family?: string;
  sacredArt: "Trivium" | "Quadrivium" | "Quintivium";
};

export type DegreeElement = {
  degree: number;
  atomicNumber?: number;
  elementName: string;
  status: "periodic" | "ether-doctrine";
};

export const MAJOR_LESSONS: MajorLesson[] = [
  { number: 1, name: "Christism", religiousOrder: "Holy Templist Ministries", lodge: "No. 1", divineHouse: "Nut", deity: "Sutekh", family: "Bethuel", sacredArt: "Trivium" },
  { number: 2, name: "Mosesism", religiousOrder: "Holy Seed Baptist Synagogue", lodge: "No. 3", divineHouse: "Set", deity: "Nebthet", family: "Zodok", sacredArt: "Trivium" },
  { number: 3, name: "Muhammadism", religiousOrder: "Ansaaruallah Holy Shrine of Al Mahdhi", lodge: "No. 5", divineHouse: "Mu", deity: "Aset", family: "Sayyid", sacredArt: "Trivium" },
  { number: 4, name: "Sufism", religiousOrder: "Sons of Al Khidr", lodge: "No. 7", divineHouse: "Nefu", deity: "Asaru", sacredArt: "Quadrivium" },
  { number: 5, name: "Kabalism", religiousOrder: "Sanhedrin Magi's", lodge: "No. 13", divineHouse: "Ptah", deity: "Nut", sacredArt: "Quintivium" },
  { number: 6, name: "Magism", religiousOrder: "Devotees of Shemsizedek", lodge: "No. 15", divineHouse: "Atum Re", deity: "Geb", sacredArt: "Quintivium" },
  { number: 7, name: "Summerianism", religiousOrder: "Shuyukh of Shemesh", lodge: "No. 27", divineHouse: "Amun Re", deity: "Tefnut", sacredArt: "Quintivium" },
  { number: 8, name: "Shamanism", religiousOrder: "Hierophants of Amun-Ra", lodge: "No. 9", divineHouse: "Atun Re", deity: "Shu", family: "Neb", sacredArt: "Quintivium" },
  { number: 9, name: "Gnosticism", religiousOrder: "Seamu of Annu", lodge: "No. 19", divineHouse: "Anun Re", deity: "Atum-Re", family: "Nupu", sacredArt: "Quintivium" },
];

export const QUINTIVIUM = ["Dialectics", "Harmonics", "Physics", "Optics", "Noology"] as const;
export const TRIVIUM = ["Grammar", "Logic", "Rhetoric"] as const;
export const QUADRIVIUM = ["Arithmetic", "Geometry", "Harmonics / Music", "Astronomy"] as const;

export const MASTER_TEMPLATE_FIELDS = [
  "Major Lesson", "Element", "Temple Lodge", "Greeting", "Religious Order", "Divine House", "Deity", "Family", "Theme",
  "Degree Introduction", "Metal", "Star Constellation", "Grip", "Password", "Token", "Virtue", "Morale", "Principle",
  "Meaning of Degree", "Templist Interview Questions", "Lesson Overview", "Study of Degree", "Test of Study", "Sacred Art",
  "Academia", "Assignment", "Symbolism", "Labor/Career Knowledge", "Obligation of Profession", "Conclusion",
] as const;

export function curriculumThemeForDegree(degree: number): CurriculumTheme {
  if (!Number.isInteger(degree) || degree < 1 || degree > 144) throw new RangeError("degree must be an integer from 1 to 144");
  if (degree <= 36) return "Masonic";
  if (degree <= 72) return "Magi";
  if (degree <= 108) return "Shriner";
  if (degree < 144) return "Mystic";
  return "Elite";
}

export function elementForDegree(degree: number): DegreeElement {
  if (!Number.isInteger(degree) || degree < 1 || degree > 144) throw new RangeError("degree must be an integer from 1 to 144");
  if (degree <= 118) return { degree, atomicNumber: degree, elementName: `Periodic element ${degree}`, status: "periodic" };
  return { degree, elementName: `Ether ${degree - 118}`, status: "ether-doctrine" };
}

export function majorLesson(number: MajorLesson["number"]): MajorLesson {
  const lesson = MAJOR_LESSONS.find((entry) => entry.number === number);
  if (!lesson) throw new RangeError("major lesson must be 1 through 9");
  return lesson;
}

export const CURRICULUM_GUARDRAILS = {
  preserveMajorLessonNames: true,
  primaryLearnerTerm: "Templist",
  reserveNoonebuForEliteElect: true,
  exactTestsAreImmutable: true,
  historicalAndTempleMaterialMustBeDistinguished: true,
  etherElementsAreDoctrineNotEstablishedChemistry: true,
  neology: "Create new words only through the law, grammar, etymology, and dialectics of the particular language.",
  quintiviumAttribution: "Dr. Lawiy Zodok Shamu-El",
} as const;
