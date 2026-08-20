import type { MajorLesson, NaturalizationSuffix } from "./types";

export interface LessonRule {
  lesson: MajorLesson;
  chamber: string;
  language: string;
  house: string;
  deity: string;
  namingFormula: string;
  mixingAllowed: boolean;
  neterAllowed: boolean;
}

export const LESSON_RULES: Record<MajorLesson, LessonRule> = {
  1: { lesson: 1, chamber: "Christism", language: "English", house: "House of Set", deity: "Sutekh", namingFormula: "prefix title + birth (Sa) name + divine suffix", mixingAllowed: false, neterAllowed: false },
  2: { lesson: 2, chamber: "Mosesim", language: "Hebrew", house: "House of Mu", deity: "Nebthet", namingFormula: "prefix title + temple name + divine family name", mixingAllowed: false, neterAllowed: false },
  3: { lesson: 3, chamber: "Muhammadism", language: "Arabic", house: "House of Nefu", deity: "Aset", namingFormula: "prefix title + temple name + divine family name", mixingAllowed: false, neterAllowed: false },
  4: { lesson: 4, chamber: "Sufism", language: "Moorish Kufic - Latin", house: "House of Mu", deity: "Asaru", namingFormula: "prefix title + temple name", mixingAllowed: false, neterAllowed: false },
  5: { lesson: 5, chamber: "Kabalism", language: "Persian", house: "House of Ptah", deity: "Nut", namingFormula: "prefix title + temple name", mixingAllowed: false, neterAllowed: false },
  6: { lesson: 6, chamber: "Magism", language: "Semitic", house: "House of Atum-Re", deity: "Geb", namingFormula: "prefix title + temple name", mixingAllowed: true, neterAllowed: false },
  7: { lesson: 7, chamber: "Sumerianism", language: "Cuneiform", house: "House of Atun-Re", deity: "Tefnut", namingFormula: "prefix title + temple name + divine family name", mixingAllowed: false, neterAllowed: false },
  8: { lesson: 8, chamber: "Shamanism", language: "Ancient Egyptian - Lumerian - Atlantean", house: "House of Amun-Re", deity: "Shu", namingFormula: "prefix title + temple name", mixingAllowed: false, neterAllowed: true },
  9: { lesson: 9, chamber: "Nuwaubu", language: "Nuwaubic - Nubic", house: "House of Anun-Re", deity: "Atum-Re", namingFormula: "prefix title + temple name + divine family name", mixingAllowed: false, neterAllowed: false },
};

export const SUFFIX_LANGUAGE: Record<NaturalizationSuffix, string> = {
  Ali: "Syriac",
  El: "Ashuric",
  Al: "Arabic",
  Bey: "Turkish",
  Dey: "Ottoman",
};

export const ROYAL_HOUSES = {
  "House of Anun-Re": { tribe: "Anunite", familyName: "Nupu" },
  "House of Amun-Re": { tribe: "Amunite", familyName: "Neb" },
  "House of Atun-Re": { tribe: "Atunite", familyName: "Zodok" },
  "House of Atum-Re": { tribe: "Atumite", familyName: "Sayyid" },
} as const;

export const DEGREE_144_TITLES = ["Neb", "Nebu", "Noonebu", "Neb Nebu"] as const;
export const DEGREE_144_FAMILY_NAMES = ["Nun", "Nupu", "NoopooH"] as const;
