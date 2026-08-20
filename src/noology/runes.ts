export type RuneOrientation = "upright" | "reversed";

export type NuwaubicRune = {
  id: number;
  name: string;
  upright: string;
  reversed: string | null;
  reversible: boolean;
};

export const NUWAUBIC_RUNES: NuwaubicRune[] = [
  { id: 1, name: "Nasuf", upright: "The Self", reversed: "Loss of self; fragmentation; self-alienation", reversible: true },
  { id: 2, name: "Sharukuf", upright: "Unity", reversed: "Disunity; separation; division", reversible: true },
  { id: 3, name: "Rawuh", upright: "The Messenger", reversed: "Blocked message; miscommunication; silence", reversible: true },
  { id: 4, name: "Hen", upright: "Inherited pathways", reversed: "Disconnection from inheritance; broken pathways", reversible: true },
  { id: 5, name: "Gawu", upright: "Change and growth", reversed: "Stagnation; resistance; decline", reversible: true },
  { id: 6, name: "Sarun", upright: "Secret", reversed: "Disclosure; exposure; revelation", reversible: true },
  { id: 7, name: "Ka'Wub", upright: "Difficulty", reversed: "Ease; relief; resolution", reversible: true },
  { id: 8, name: "Batul", upright: "The Hero", reversed: "The Villain", reversible: true },
  { id: 9, name: "Dafu", upright: "Power", reversed: "Power", reversible: false },
  { id: 10, name: "Istahraas", upright: "Emotion control", reversed: "Emotional chaos; loss of control", reversible: true },
  { id: 11, name: "Mamluk", upright: "Successful fulfillment", reversed: "Failed fulfillment; incompletion", reversible: true },
  { id: 12, name: "Faruh", upright: "Light, joy, and happiness", reversed: "Darkness, sorrow, and unhappiness", reversible: true },
  { id: 13, name: "Hasud", upright: "The harvest", reversed: "Scarcity; deprivation; failed harvest", reversible: true },
  { id: 14, name: "Faatuh", upright: "Opening, clarity, and fire", reversed: "Closure, obscurity, and extinguishment", reversible: true },
  { id: 15, name: "Mujahud", upright: "Spirit, battles, and wars", reversed: "Peace, truce, and reconciliation", reversible: true },
  { id: 16, name: "Zaru", upright: "Fertility, birth, and developing", reversed: "Barrenness, sterility, and arrested development", reversible: true },
  { id: 17, name: "Harukhant", upright: "Transition and movement", reversed: "Stagnation and immobility", reversible: true },
  { id: 18, name: "Sabub", upright: "Conducting powers and water", reversed: "Blocked flow; non-conduction; stagnation", reversible: true },
  { id: 19, name: "Matur", upright: "Elemental powers, fire, and the Creator", reversed: "Elemental imbalance, extinguishment, and creative blockage", reversible: true },
  { id: 20, name: "Safur", upright: "Journey, union, and communication", reversed: "Separation, division, and misunderstanding", reversible: true },
  { id: 21, name: "Bab", upright: "Gateway to higher realms", reversed: "Barrier to higher realms; closure", reversible: true },
  { id: 22, name: "Najuh", upright: "Results, breakthroughs, and transformation", reversed: "Stagnation, setbacks, and obstacles", reversible: true },
  { id: 23, name: "Bagum", upright: "Winter, stillness, and powerless", reversed: "Heat, activity, and power", reversible: true },
  { id: 24, name: "Hayuh", upright: "Life Force and wholeness", reversed: null, reversible: false },
  { id: 25, name: "Blank Stone", upright: "The Unknown, destiny, the beginning, and the end", reversed: null, reversible: false },
];

export function getRuneByName(name: string): NuwaubicRune | undefined {
  const normalized = name.trim().toLowerCase();
  return NUWAUBIC_RUNES.find((rune) => rune.name.toLowerCase() === normalized);
}

export function castRunes(count: 1 | 3 | 5, random: () => number = Math.random) {
  const pool = [...NUWAUBIC_RUNES];
  const cast: Array<{ rune: NuwaubicRune; orientation: RuneOrientation }> = [];

  for (let i = 0; i < count; i += 1) {
    const index = Math.floor(random() * pool.length);
    const [rune] = pool.splice(index, 1);
    const orientation: RuneOrientation = rune.reversible && random() >= 0.5 ? "reversed" : "upright";
    cast.push({ rune, orientation });
  }

  return cast;
}
