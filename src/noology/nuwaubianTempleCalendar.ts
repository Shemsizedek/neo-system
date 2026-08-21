export type TempleCycleKind =
  | 'SOLAR'
  | 'LUNAR'
  | 'STELLAR'
  | 'SOTHIC'
  | 'NILOTIC'
  | 'EQUINOX'
  | 'SOLSTICE'
  | 'SEASONAL'
  | 'LECTIONARY'
  | 'FEAST'
  | 'FAST'
  | 'TEMPLE_OBSERVANCE'

export type TempleCalendarSource = {
  title: string
  authorOrAuthority?: string
  sourceClass: 'NEO_ECCLESIASTICAL_SOURCE' | 'COMMUNITY_TRADITION' | 'DOCUMENTED_OBSERVATION' | 'ASTRONOMICAL_OBSERVATION'
  notes?: string
}

export type TempleObservance = {
  id: string
  title: string
  kind: TempleCycleKind
  startsAt: Date
  endsAt?: Date
  sacredColor?: string
  vibrationOrMood?: string
  readings?: string[]
  prayersOrPractices?: string[]
  feastOrFast?: 'FEAST' | 'FAST' | 'NEITHER'
  celestialMarker?: string
  naturalMarker?: string
  source?: TempleCalendarSource
}

export type NuwaubianDate = {
  year: number
  month: number
  day: number
  week: 1 | 2 | 3 | 4
  dayInWeek: number
  ordinalDay: number
  sourceCycleDate: Date
  sourceCycleYear: 53
  sourceLabel: string
  dailyWord?: string
}

export type TempleCalendarContext = {
  tradition: 'NUWAUBIAN'
  timeSystem: 'NILOTIC_TIME'
  asOf: Date
  observances: TempleObservance[]
  sunCycle?: string
  moonCycle?: string
  stellarCycle?: string
  siriusOrSothicMarker?: string
  nileRenewalMarker?: string
  equinoxOrSolsticeMarker?: string
  currentSeason?: string
  lectionaryReadings?: string[]
  source?: TempleCalendarSource
}

export type TempleCalendarSnapshot = {
  tradition: 'NUWAUBIAN'
  timeSystem: 'NILOTIC_TIME'
  asOf: Date
  nuwaubianDate: NuwaubianDate
  activeObservances: TempleObservance[]
  upcomingObservances: TempleObservance[]
  naturalCycleSignals: string[]
  lectionaryReadings: string[]
  sacredColors: string[]
  vibrationsOrMoods: string[]
  calendarPrinciples: readonly string[]
}

export const nuwaubianCalendarSource: TempleCalendarSource = {
  title: 'Nuwaubian Calendar: A Daily Word From Maku',
  authorOrAuthority: 'Nayya: Malachi Zodok York-El / Maku',
  sourceClass: 'NEO_ECCLESIASTICAL_SOURCE',
  notes: '1998 edition. Source states 19 months, 19 days per month, four internal weeks (5 + 5 + 5 + 4 days), 19 hours per day, and identifies the edition as Nuwaubian Year 53.'
}

export const nuwaubianCalendarDoctrine = {
  title: 'The Nuwaubian Calendar: The Daily Word from Maku',
  authority: 'Maku / Chief Black Thunderbird / Dr. Malachi Z. York-El',
  timeSystem: 'Nilotic Time / Nile Time',
  summary:
    'A sacred and ecclesiastical timekeeping system described as aligning temple observance, spiritual instruction and cultural practice with natural solar, lunar, stellar, Nilotic and seasonal cycles.',
  principles: [
    'Timekeeping should follow observed natural and celestial cycles rather than operate as an isolated administrative abstraction.',
    'The source calendar uses nineteen months of nineteen days each: a 361-day sacred year.',
    'Each month contains four internal weeks: five days, five days, five days, then four days.',
    'The source describes a Nuwaubian day as containing nineteen hours; no sub-day conversion ratio is inferred where the source does not provide one.',
    'The 1998 source year is identified as Nuwaubian Year 53, with June 26, 1945 designated Year 1.',
    'The rising and renewal cycles associated with the Nile function as a natural symbol and marker of renewal.',
    'The heliacal or sacred appearance of Sirius / Sepdet / Sothis functions as a new-year and renewal marker within the described system.',
    'Equinoxes and solstices are timing markers for seasonal transition, discipline, fasting, feasting and sacred observance.',
    'Temple seasons may carry sacred colors, moods or vibrations, readings, prayers and practices.',
    'The lectionary is a knowledge-sequencing mechanism that synchronizes daily and weekly study with the sacred cycle.',
    'Calendar interpretation should preserve the source tradition and distinguish supplied observances from later astronomical or administrative calculations.'
  ] as const
}

export const NUWAUBIAN_MONTHS_PER_YEAR = 19
export const NUWAUBIAN_DAYS_PER_MONTH = 19
export const NUWAUBIAN_DAYS_PER_YEAR = 361
export const NUWAUBIAN_HOURS_PER_DAY = 19
export const NUWAUBIAN_SOURCE_YEAR = 53 as const
export const NUWAUBIAN_SOURCE_EPOCH = new Date(Date.UTC(1998, 5, 26))

const MS_PER_DAY = 86_400_000
const unique = <T>(items: T[]) => [...new Set(items)]

/**
 * Daily Words are indexed by sacred-cycle position, not by Gregorian year.
 * Additional entries can be transcribed from the source without changing the
 * conversion engine. The first carried-forward entry below is the cycle point
 * that corresponds to 2026-08-21.
 */
export const nuwaubianDailyWordRegistry: Record<string, string> = {
  '10-5': 'Only Your Body Is Locked Up, Not Your Soul. Now Free Your Spirit And Your Body Will Follow.'
}

export const nuwaubianNamedObservances = [
  'Munajiyy Yawum',
  'El Mahdi Yawum',
  'Anunnaqi Wa Neteru Yawum',
  'Zaguanaat Yawum',
  "A'yd Shil Hamudtud",
  'Uwludaat Yawum',
  'Aythr Yawum',
  'Sadugud Yawum',
  "Raju' Shil El Masuh Yawum"
] as const

function utcDayStart(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

function weekPosition(day: number): { week: 1 | 2 | 3 | 4; dayInWeek: number } {
  if (day <= 5) return { week: 1, dayInWeek: day }
  if (day <= 10) return { week: 2, dayInWeek: day - 5 }
  if (day <= 15) return { week: 3, dayInWeek: day - 10 }
  return { week: 4, dayInWeek: day - 15 }
}

/**
 * Carries the 1998 Nuwaubian Calendar forward as a continuous 361-day cycle.
 *
 * Source anchor:
 *   1998-06-26 Gregorian = Nuwaubian Year 53, Month 1, Day 1.
 *
 * The algorithm intentionally does not insert Gregorian leap days into the
 * sacred year. Gregorian leap days simply advance the continuous day count,
 * so the Nuwaubian new year moves through Gregorian dates over time.
 */
export function toNuwaubianDate(date: Date): NuwaubianDate {
  const elapsedDays = Math.floor((utcDayStart(date) - NUWAUBIAN_SOURCE_EPOCH.getTime()) / MS_PER_DAY)
  const yearOffset = Math.floor(elapsedDays / NUWAUBIAN_DAYS_PER_YEAR)
  const dayOfYearZero = ((elapsedDays % NUWAUBIAN_DAYS_PER_YEAR) + NUWAUBIAN_DAYS_PER_YEAR) % NUWAUBIAN_DAYS_PER_YEAR
  const month = Math.floor(dayOfYearZero / NUWAUBIAN_DAYS_PER_MONTH) + 1
  const day = (dayOfYearZero % NUWAUBIAN_DAYS_PER_MONTH) + 1
  const { week, dayInWeek } = weekPosition(day)
  const sourceCycleDate = new Date(NUWAUBIAN_SOURCE_EPOCH.getTime() + dayOfYearZero * MS_PER_DAY)
  const dailyWord = nuwaubianDailyWordRegistry[`${month}-${day}`]

  return {
    year: NUWAUBIAN_SOURCE_YEAR + yearOffset,
    month,
    day,
    week,
    dayInWeek,
    ordinalDay: dayOfYearZero + 1,
    sourceCycleDate,
    sourceCycleYear: NUWAUBIAN_SOURCE_YEAR,
    sourceLabel: `Year ${NUWAUBIAN_SOURCE_YEAR}, Month ${month}, Day ${day}`,
    dailyWord
  }
}

export function formatNuwaubianDate(value: NuwaubianDate): string {
  return `Nuwaubian Year ${value.year}, Month ${value.month}, Day ${value.day} — Week ${value.week}, Day ${value.dayInWeek}`
}

/**
 * Resolves a source-supplied Nuwaubian / Nilotic calendar context for the World Credit Clock.
 *
 * This function does not invent feast dates, sacred colors, readings, Sirius dates,
 * Nile flood dates, lunar phases or Indigenous seasonal knowledge. Those are supplied
 * as observances/markers and then synchronized with the clock.
 */
export function resolveTempleCalendar(context: TempleCalendarContext): TempleCalendarSnapshot {
  const time = context.asOf.getTime()
  const activeObservances = context.observances.filter((item) => {
    const start = item.startsAt.getTime()
    const end = item.endsAt?.getTime() ?? start + 86_400_000
    return time >= start && time < end
  })

  const upcomingObservances = context.observances
    .filter((item) => item.startsAt.getTime() > time)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
    .slice(0, 12)

  const naturalCycleSignals = unique([
    context.sunCycle,
    context.moonCycle,
    context.stellarCycle,
    context.siriusOrSothicMarker,
    context.nileRenewalMarker,
    context.equinoxOrSolsticeMarker,
    context.currentSeason,
    ...activeObservances.map((item) => item.celestialMarker),
    ...activeObservances.map((item) => item.naturalMarker)
  ].filter((item): item is string => Boolean(item)))

  const lectionaryReadings = unique([
    ...(context.lectionaryReadings ?? []),
    ...activeObservances.flatMap((item) => item.readings ?? [])
  ])

  return {
    tradition: 'NUWAUBIAN',
    timeSystem: 'NILOTIC_TIME',
    asOf: context.asOf,
    nuwaubianDate: toNuwaubianDate(context.asOf),
    activeObservances,
    upcomingObservances,
    naturalCycleSignals,
    lectionaryReadings,
    sacredColors: unique(activeObservances.map((item) => item.sacredColor).filter((item): item is string => Boolean(item))),
    vibrationsOrMoods: unique(activeObservances.map((item) => item.vibrationOrMood).filter((item): item is string => Boolean(item))),
    calendarPrinciples: nuwaubianCalendarDoctrine.principles
  }
}
