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

const PERIODIC_ELEMENTS = [
  "Hydrogen","Helium","Lithium","Beryllium","Boron","Carbon","Nitrogen","Oxygen","Fluorine","Neon",
  "Sodium","Magnesium","Aluminum","Silicon","Phosphorus","Sulfur","Chlorine","Argon","Potassium","Calcium",
  "Scandium","Titanium","Vanadium","Chromium","Manganese","Iron","Cobalt","Nickel","Copper","Zinc",
  "Gallium","Germanium","Arsenic","Selenium","Bromine","Krypton","Rubidium","Strontium","Yttrium","Zirconium",
  "Niobium","Molybdenum","Technetium","Ruthenium","Rhodium","Palladium","Silver","Cadmium","Indium","Tin",
  "Antimony","Tellurium","Iodine","Xenon","Cesium","Barium","Lanthanum","Cerium","Praseodymium","Neodymium",
  "Promethium","Samarium","Europium","Gadolinium","Terbium","Dysprosium","Holmium","Erbium","Thulium","Ytterbium",
  "Lutetium","Hafnium","Tantalum","Tungsten","Rhenium","Osmium","Iridium","Platinum","Gold","Mercury",
  "Thallium","Lead","Bismuth","Polonium","Astatine","Radon","Francium","Radium","Actinium","Thorium",
  "Protactinium","Uranium","Neptunium","Plutonium","Americium","Curium","Berkelium","Californium","Einsteinium","Fermium",
  "Mendelevium","Nobelium","Lawrencium","Rutherfordium","Dubnium","Seaborgium","Bohrium","Hassium","Meitnerium","Darmstadtium",
  "