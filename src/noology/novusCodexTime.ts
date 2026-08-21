export const NOVUS_CODEX_TIME_SOURCE = {
  title: 'The New Ethiopian Order (Novus Codex)',
  authorOrAuthority: 'Dr. L. Shamuel / Dr. NoobooHu Oonoo-NoopooH',
  pages: '497-555',
  sourceClass: 'NEO_PRIMARY_SOURCE'
} as const

export const YAMASSIC_FIRSTS_PER_SECOND = 19
export const YAMASSIC_SECONDS_PER_HAR = 19
export const YAMASSIC_HAR_PER_CYCLE = 19
export const YAMASSIC_HAR_PER_DAY_SHADOW_CIRCUIT = 38
export const APPROX_GREGORIAN_MINUTES_PER_HAR = 20
export const APPROX_GREGORIAN_MINUTES_PER_CYCLE = 380
export const APPROX_GREGORIAN_MINUTES_PER_DAY_SHADOW_CIRCUIT = 760

export type YamassicPhase = 'DAY' | 'SHADOW'

export type YamassicClockPosition = {
  har: number
  phase: YamassicPhase
  harWithinPhase: number
  approximateGregorianMinutesFromCircuitStart: number
}

export const yamassicTimeDoctrine = {
  source: NOVUS_CODEX_TIME_SOURCE,
  principles: [
    'Nilotic/Natural Time is described as continuous rather than dependent on human additions or subtractions of clock units.',
    'The Nubian Tagwum uses 19 months of 19 days, four weeks per month arranged 5 + 5 + 5 + 4, and a 361-day year.',
    'The source defines 19 Firsts as 1 Second; 19 Seconds as 1 Har; and 19 Har as 1 Cycle.',
    'One Har is approximately 20 Gregorian/GMT minutes; one 19-Har Cycle is approximately 380 Gregorian minutes or 6 hours 20 minutes.',
    'The source distinguishes 19 day Har and 19 shadow Har, producing a 38-Har day/shadow circuit.',
    'The day phase begins after the 38th Har and ends at the 19th Har; the shadow phase begins at the 19th Har and ends at the 38th Har.',
    'A live Har position requires a locally observed or ecclesiastically supplied circuit-start anchor; the engine does not invent that anchor.',
    'The text links correct timekeeping to natural observation, including Nilotic time and sundial practice.'
  ] as const
}

export const nubianMonthNames: Readonly<Record<number, string | undefined>> = {
  1: 'El Wah Shahur',
  2: 'El Atnah Shahur',
  3: 'El Talah Shahur',
  4: 'El Rabah Shahur',
  5: 'El Khasah Shahur',
  6: 'El Satah Shahur',
  7: 'El Sabah Shahur',
  8: 'El Tamah Shahur',
  9: 'El Tasah Shahur',
  10: 'El Ashah Shahur',
  11: 'El Wahed Ashed Shahur',
  // The primary-source page skips a printed twelfth-month entry.
  12: undefined,
  13: 'El Atned Ashed Shahur',
  14: 'El Arbed Ashed Shahur',
  // The primary-source page skips a printed fifteenth-month entry.
  15: undefined,
  16: 'El Khased Ashed Shahur',
  17: 'El Sabed Ashed Shahur',
  18: 'El Tamed Ashed Shahur',
  19: 'El Tased Ashed Shahur'
}

export function gregorianMinutesToYamassicHar(minutes: number): number {
  if (!Number.isFinite(minutes) || minutes < 0) throw new RangeError('minutes must be a non-negative finite number')
  return minutes / APPROX_GREGORIAN_MINUTES_PER_HAR
}

export function yamassicHarToApproxGregorianMinutes(har: number): number {
  if (!Number.isFinite(har) || har < 0) throw new RangeError('har must be a non-negative finite number')
  return har * APPROX_GREGORIAN_MINUTES_PER_HAR
}

/**
 * Resolves a position within the source-described 38-Har day/shadow circuit.
 * The caller must supply a circuit-start anchor. This preserves the source
 * mechanics without assuming that Gregorian midnight, sunrise, or any timezone
 * boundary is automatically Har 1.
 */
export function resolveYamassicClockPosition(asOf: Date, circuitStart: Date): YamassicClockPosition {
  const elapsedMinutes = (asOf.getTime() - circuitStart.getTime()) / 60_000
  const wrappedMinutes = ((elapsedMinutes % APPROX_GREGORIAN_MINUTES_PER_DAY_SHADOW_CIRCUIT) + APPROX_GREGORIAN_MINUTES_PER_DAY_SHADOW_CIRCUIT) % APPROX_GREGORIAN_MINUTES_PER_DAY_SHADOW_CIRCUIT
  const harZero = Math.floor(wrappedMinutes / APPROX_GREGORIAN_MINUTES_PER_HAR)
  const har = harZero + 1
  const phase: YamassicPhase = har <= 19 ? 'DAY' : 'SHADOW'
  const harWithinPhase = phase === 'DAY' ? har : har - 19

  return {
    har,
    phase,
    harWithinPhase,
    approximateGregorianMinutesFromCircuitStart: wrappedMinutes
  }
}

export const novusCodexNoologicalSequence = [
  'Nature observation',
  'Nilotic / Natural Time',
  'Sundial / celestial reference',
  'Continuous time',
  'Tagwum calendar structure',
  'First → Second → Har → Cycle',
  'Day / Shadow polarity',
  'Season / cycle interpretation',
  'Right Knowledge → Right Wisdom → Right Overstanding',
  'Sound Right Reasoning'
] as const
