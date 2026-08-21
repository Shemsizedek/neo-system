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
  activeObservances: TempleObservance[]
  upcomingObservances: TempleObservance[]
  naturalCycleSignals: string[]
  lectionaryReadings: string[]
  sacredColors: string[]
  vibrationsOrMoods: string[]
  calendarPrinciples: readonly string[]
}

export const nuwaubianCalendarDoctrine = {
  title: 'The Nuwaubian Calendar: The Daily Word from Maku',
  authority: 'Maku / Chief Black Thunderbird / Dr. Malachi Z. York-El',
  timeSystem: 'Nilotic Time / Nile Time',
  summary:
    'A sacred and ecclesiastical timekeeping system described as aligning temple observance, spiritual instruction and cultural practice with natural solar, lunar, stellar, Nilotic and seasonal cycles.',
  principles: [
    'Timekeeping should follow observed natural and celestial cycles rather than operate as an isolated administrative abstraction.',
    'The rising and renewal cycles associated with the Nile function as a natural symbol and marker of renewal.',
    'The heliacal or sacred appearance of Sirius / Sepdet / Sothis functions as a new-year and renewal marker within the described system.',
    'Equinoxes and solstices are timing markers for seasonal transition, discipline, fasting, feasting and sacred observance.',
    'Temple seasons may carry sacred colors, moods or vibrations, readings, prayers and practices.',
    'The lectionary is a knowledge-sequencing mechanism that synchronizes daily and weekly study with the sacred cycle.',
    'Calendar interpretation should preserve the source tradition and distinguish supplied observances from later astronomical or administrative calculations.'
  ] as const
}

const unique = <T>(items: T[]) => [...new Set(items)]

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
    activeObservances,
    upcomingObservances,
    naturalCycleSignals,
    lectionaryReadings,
    sacredColors: unique(activeObservances.map((item) => item.sacredColor).filter((item): item is string => Boolean(item))),
    vibrationsOrMoods: unique(activeObservances.map((item) => item.vibrationOrMood).filter((item): item is string => Boolean(item))),
    calendarPrinciples: nuwaubianCalendarDoctrine.principles
  }
}
